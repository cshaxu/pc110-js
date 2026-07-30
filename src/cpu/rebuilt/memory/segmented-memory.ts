import type { SegmentName } from "../state/segments.js";
import type { RebuiltCpuState } from "../state/cpu-state.js";
import {
  CR0_PAGING,
  PageFaultError,
  translateLinearAddress,
  type PagingAccess
} from "../../../memory/address-translation.js";

export interface RebuiltMemoryBus {
  readUint8(address: number): number;
  writeUint8(address: number, value: number): void;
  runAtomically?<T>(operation: () => T): T;
}

export class SegmentAccessError extends Error {
  public constructor(
    readonly segment: SegmentName,
    message: string
  ) {
    super(message);
  }
}

export class SegmentedMemory {
  public constructor(
    private readonly bus: RebuiltMemoryBus,
    private readonly state: RebuiltCpuState
  ) {}

  public read8(segment: SegmentName, offset: number, addressSize: 16 | 32): number {
    return this.bus.readUint8(this.translate(segment, offset, addressSize, false, false)) & 0xff;
  }

  public readCode8(offset: number, addressSize: 16 | 32): number {
    return this.bus.readUint8(this.translate("cs", offset, addressSize, false, true)) & 0xff;
  }

  public testCodeOffset(offset: number): void {
    this.translate("cs", offset, this.state.codeDefault32() ? 32 : 16, false, true);
  }

  public readPhysical8(address: number): number {
    return this.bus.readUint8(address >>> 0) & 0xff;
  }

  public writePhysical8(address: number, value: number): void {
    this.bus.writeUint8(address >>> 0, value & 0xff);
  }

  public readLinear8(address: number): number {
    return this.bus.readUint8(this.translateLinear(address, false)) & 0xff;
  }

  public writeLinear8(address: number, value: number): void {
    this.bus.writeUint8(this.translateLinear(address, true), value & 0xff);
  }

  public runAtomically<T>(operation: () => T): T {
    return this.bus.runAtomically?.(operation) ?? operation();
  }

  public read16(segment: SegmentName, offset: number, addressSize: 16 | 32): number {
    const addresses = this.translateRange(segment, offset, addressSize, 2, false, false);
    return this.bus.readUint8(addresses[0]!) | (this.bus.readUint8(addresses[1]!) << 8);
  }

  public read32(segment: SegmentName, offset: number, addressSize: 16 | 32): number {
    const addresses = this.translateRange(segment, offset, addressSize, 4, false, false);
    return (
      (this.bus.readUint8(addresses[0]!) |
        (this.bus.readUint8(addresses[1]!) << 8) |
        (this.bus.readUint8(addresses[2]!) << 16) |
        (this.bus.readUint8(addresses[3]!) << 24)) >>>
      0
    );
  }

  public write8(segment: SegmentName, offset: number, value: number, addressSize: 16 | 32): void {
    this.bus.writeUint8(this.translate(segment, offset, addressSize, true, false), value & 0xff);
  }

  public write16(segment: SegmentName, offset: number, value: number, addressSize: 16 | 32): void {
    const addresses = this.translateRange(segment, offset, addressSize, 2, true, false);
    this.bus.writeUint8(addresses[0]!, value & 0xff);
    this.bus.writeUint8(addresses[1]!, (value >>> 8) & 0xff);
  }

  public write32(segment: SegmentName, offset: number, value: number, addressSize: 16 | 32): void {
    const addresses = this.translateRange(segment, offset, addressSize, 4, true, false);
    addresses.forEach((address, index) =>
      this.bus.writeUint8(address, (value >>> (index * 8)) & 0xff)
    );
  }

  private translate(
    segmentName: SegmentName,
    offset: number,
    addressSize: 16 | 32,
    write: boolean,
    instructionFetch: boolean
  ): number {
    const segment = this.state.readSegment(segmentName);
    const normalizedOffset = addressSize === 16 ? offset & 0xffff : offset >>> 0;
    const protectedMode = Boolean(this.state.readCr0() & 0x00000001);
    const virtual8086 = this.state.isVirtual8086();
    if (protectedMode && !virtual8086)
      this.validateProtectedAccess(
        segmentName,
        segment,
        normalizedOffset,
        1,
        write,
        instructionFetch
      );
    const base = virtual8086 ? (segment.selector << 4) >>> 0 : segment.base;
    const linear = (base + normalizedOffset) >>> 0;
    try {
      return translateLinearAddress(
        {
          readUint32: (address) => this.readPhysical32(address),
          writeUint32: (address, value) => this.writePhysical32(address, value)
        },
        protectedMode ? this.state.readCr0() : this.state.readCr0() & ~CR0_PAGING,
        this.state.readCr3(),
        linear,
        this.pagingAccess(write)
      );
    } catch (error) {
      if (error instanceof PageFaultError) this.state.writeCr2(error.linearAddress);
      throw error;
    }
  }

  private translateRange(
    segment: SegmentName,
    offset: number,
    addressSize: 16 | 32,
    width: 2 | 4,
    write: boolean,
    instructionFetch: boolean
  ): readonly number[] {
    this.validateRange(segment, offset, addressSize, width, write, instructionFetch);
    return Array.from({ length: width }, (_, index) =>
      this.translate(segment, offset + index, addressSize, write, instructionFetch)
    );
  }

  private validateRange(
    segmentName: SegmentName,
    offset: number,
    addressSize: 16 | 32,
    width: 2 | 4,
    write: boolean,
    instructionFetch: boolean
  ): void {
    if (!(this.state.readCr0() & 0x00000001) || this.state.isVirtual8086()) return;
    const normalizedOffset = addressSize === 16 ? offset & 0xffff : offset >>> 0;
    this.validateProtectedAccess(
      segmentName,
      this.state.readSegment(segmentName),
      normalizedOffset,
      width,
      write,
      instructionFetch
    );
  }

  private validateProtectedAccess(
    segmentName: SegmentName,
    segment: ReturnType<RebuiltCpuState["readSegment"]>,
    offset: number,
    width: number,
    write: boolean,
    instructionFetch: boolean
  ): void {
    if (segment.valid === false)
      throw new SegmentAccessError(segmentName, `Segment ${segmentName} is invalid`);
    const lower = segment.expandDown ? (segment.limit + 1) >>> 0 : 0;
    const upper = segment.expandDown ? (segment.default32 ? 0xffffffff : 0xffff) : segment.limit;
    if (offset < lower || offset > upper || width - 1 > upper - offset)
      throw new SegmentAccessError(segmentName, `Segment ${segmentName} limit exceeded`);
    if (instructionFetch) return;
    if (write && segment.writable === false)
      throw new SegmentAccessError(segmentName, `Segment ${segmentName} is not writable`);
    if (!write && segment.executable === true && segment.readable === false)
      throw new SegmentAccessError(segmentName, `Segment ${segmentName} is not readable`);
  }

  private pagingAccess(write: boolean): PagingAccess {
    const flags = this.state.flags.read();
    const code = this.state.readSegment("cs");
    const user = Boolean(flags & 0x00020000) || (code.dpl ?? code.selector & 3) === 3;
    return { write, user };
  }

  private translateLinear(address: number, write: boolean): number {
    const protectedMode = Boolean(this.state.readCr0() & 0x00000001);
    try {
      return translateLinearAddress(
        {
          readUint32: (physical) => this.readPhysical32(physical),
          writeUint32: (physical, value) => this.writePhysical32(physical, value)
        },
        protectedMode ? this.state.readCr0() : this.state.readCr0() & ~CR0_PAGING,
        this.state.readCr3(),
        address,
        { write, user: false }
      );
    } catch (error) {
      if (error instanceof PageFaultError) this.state.writeCr2(error.linearAddress);
      throw error;
    }
  }

  private readPhysical32(address: number): number {
    return (
      (this.bus.readUint8(address >>> 0) |
        (this.bus.readUint8((address + 1) >>> 0) << 8) |
        (this.bus.readUint8((address + 2) >>> 0) << 16) |
        (this.bus.readUint8((address + 3) >>> 0) << 24)) >>>
      0
    );
  }

  private writePhysical32(address: number, value: number): void {
    this.bus.writeUint8(address >>> 0, value & 0xff);
    this.bus.writeUint8((address + 1) >>> 0, (value >>> 8) & 0xff);
    this.bus.writeUint8((address + 2) >>> 0, (value >>> 16) & 0xff);
    this.bus.writeUint8((address + 3) >>> 0, (value >>> 24) & 0xff);
  }
}
