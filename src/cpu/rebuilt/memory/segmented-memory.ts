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

export class SegmentAccessError extends Error {}

export class SegmentedMemory {
  public constructor(
    private readonly bus: RebuiltMemoryBus,
    private readonly state: RebuiltCpuState
  ) {}

  public read8(segment: SegmentName, offset: number, addressSize: 16 | 32): number {
    return this.bus.readUint8(this.translate(segment, offset, addressSize, false)) & 0xff;
  }

  public readPhysical8(address: number): number {
    return this.bus.readUint8(address >>> 0) & 0xff;
  }

  public runAtomically<T>(operation: () => T): T {
    return this.bus.runAtomically?.(operation) ?? operation();
  }

  public read16(segment: SegmentName, offset: number, addressSize: 16 | 32): number {
    return (
      this.read8(segment, offset, addressSize) | (this.read8(segment, offset + 1, addressSize) << 8)
    );
  }

  public read32(segment: SegmentName, offset: number, addressSize: 16 | 32): number {
    return (
      (this.read8(segment, offset, addressSize) |
        (this.read8(segment, offset + 1, addressSize) << 8) |
        (this.read8(segment, offset + 2, addressSize) << 16) |
        (this.read8(segment, offset + 3, addressSize) << 24)) >>>
      0
    );
  }

  public write8(segment: SegmentName, offset: number, value: number, addressSize: 16 | 32): void {
    this.bus.writeUint8(this.translate(segment, offset, addressSize, true), value & 0xff);
  }

  public write16(segment: SegmentName, offset: number, value: number, addressSize: 16 | 32): void {
    this.write8(segment, offset, value, addressSize);
    this.write8(segment, offset + 1, value >>> 8, addressSize);
  }

  public write32(segment: SegmentName, offset: number, value: number, addressSize: 16 | 32): void {
    this.write8(segment, offset, value, addressSize);
    this.write8(segment, offset + 1, value >>> 8, addressSize);
    this.write8(segment, offset + 2, value >>> 16, addressSize);
    this.write8(segment, offset + 3, value >>> 24, addressSize);
  }

  private translate(
    segmentName: SegmentName,
    offset: number,
    addressSize: 16 | 32,
    write: boolean
  ): number {
    const segment = this.state.readSegment(segmentName);
    const normalizedOffset = addressSize === 16 ? offset & 0xffff : offset >>> 0;
    const protectedMode = Boolean(this.state.readCr0() & 0x00000001);
    if (protectedMode && (segment.valid === false || normalizedOffset > segment.limit)) {
      throw new SegmentAccessError(`Segment ${segmentName} limit exceeded`);
    }
    const linear = (segment.base + normalizedOffset) >>> 0;
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

  private pagingAccess(write: boolean): PagingAccess {
    const flags = this.state.flags.read();
    const code = this.state.readSegment("cs");
    const user = Boolean(flags & 0x00020000) || (code.dpl ?? code.selector & 3) === 3;
    return { write, user };
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
    this.bus.writeUint8(address >>> 0, value);
    this.bus.writeUint8((address + 1) >>> 0, value >>> 8);
    this.bus.writeUint8((address + 2) >>> 0, value >>> 16);
    this.bus.writeUint8((address + 3) >>> 0, value >>> 24);
  }
}
