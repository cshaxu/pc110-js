import { Eflags } from "./flags.js";
import { RegisterFile, type RegisterFileSnapshot } from "./register-file.js";
import {
  cloneSegment,
  REAL_MODE_SEGMENT,
  RESET_CODE_SEGMENT,
  type SegmentCache,
  type SegmentName
} from "./segments.js";

export interface RebuiltCpuSnapshot {
  readonly registers: RegisterFileSnapshot;
  readonly eip: number;
  readonly eflags: number;
  readonly halted: boolean;
  readonly cr0: number;
  readonly cr2: number;
  readonly cr3: number;
  readonly segments: Readonly<Record<SegmentName, SegmentCache>>;
}

export class RebuiltCpuState {
  public readonly registers = new RegisterFile();
  public readonly flags = new Eflags();
  private eip = 0;
  private halted = false;
  private cr0 = 0x7ffffff0;
  private cr2 = 0;
  private cr3 = 0;
  private segments: Record<SegmentName, SegmentCache> = this.resetSegments();

  public constructor() {
    this.reset();
  }

  public reset(): void {
    this.registers.reset();
    this.flags.reset();
    this.eip = 0x0000fff0;
    this.halted = false;
    this.cr0 = 0x7ffffff0;
    this.cr2 = 0;
    this.cr3 = 0;
    this.segments = this.resetSegments();
  }

  public snapshot(): RebuiltCpuSnapshot {
    return {
      registers: this.registers.snapshot(),
      eip: this.eip,
      eflags: this.flags.read(),
      halted: this.halted,
      cr0: this.cr0,
      cr2: this.cr2,
      cr3: this.cr3,
      segments: {
        cs: cloneSegment(this.segments.cs),
        ds: cloneSegment(this.segments.ds),
        es: cloneSegment(this.segments.es),
        ss: cloneSegment(this.segments.ss),
        fs: cloneSegment(this.segments.fs),
        gs: cloneSegment(this.segments.gs)
      }
    };
  }

  public readEip(): number {
    return this.eip;
  }

  public writeEip(value: number): void {
    this.eip = value >>> 0;
  }

  public advanceEip(bytes: number): void {
    const next = (this.eip + bytes) >>> 0;
    this.eip = this.segments.cs.default32 ? next : next & 0xffff;
  }

  public readSegment(name: SegmentName): SegmentCache {
    return cloneSegment(this.segments[name]);
  }

  public writeSegment(name: SegmentName, segment: SegmentCache): void {
    this.segments[name] = cloneSegment(segment);
  }

  public readCr0(): number {
    return this.cr0;
  }

  public writeCr0(value: number): void {
    this.cr0 = value >>> 0;
  }

  private resetSegments(): Record<SegmentName, SegmentCache> {
    return {
      cs: cloneSegment(RESET_CODE_SEGMENT),
      ds: cloneSegment(REAL_MODE_SEGMENT),
      es: cloneSegment(REAL_MODE_SEGMENT),
      ss: cloneSegment(REAL_MODE_SEGMENT),
      fs: cloneSegment(REAL_MODE_SEGMENT),
      gs: cloneSegment(REAL_MODE_SEGMENT)
    };
  }
}
