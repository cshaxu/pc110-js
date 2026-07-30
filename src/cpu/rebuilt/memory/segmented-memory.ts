import type { SegmentName } from "../state/segments.js";
import type { RebuiltCpuState } from "../state/cpu-state.js";

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
    return this.bus.readUint8(this.translate(segment, offset, addressSize)) & 0xff;
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
    this.bus.writeUint8(this.translate(segment, offset, addressSize), value & 0xff);
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

  private translate(segmentName: SegmentName, offset: number, addressSize: 16 | 32): number {
    const segment = this.state.readSegment(segmentName);
    const normalizedOffset = addressSize === 16 ? offset & 0xffff : offset >>> 0;
    const protectedMode = Boolean(this.state.readCr0() & 0x00000001);
    if (protectedMode && (segment.valid === false || normalizedOffset > segment.limit)) {
      throw new SegmentAccessError(`Segment ${segmentName} limit exceeded`);
    }
    return (segment.base + normalizedOffset) >>> 0;
  }
}
