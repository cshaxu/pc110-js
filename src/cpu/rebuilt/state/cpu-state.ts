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
  readonly interruptInhibitBoundaries: number;
  readonly maskableInterruptsInhibited: boolean;
  readonly cr0: number;
  readonly cr2: number;
  readonly cr3: number;
  readonly debug: readonly number[];
  readonly test: readonly number[];
  readonly gdtr: DescriptorTable;
  readonly idtr: DescriptorTable;
  readonly ldtr: SystemSelector;
  readonly tr: SystemSelector;
  readonly segments: Readonly<Record<SegmentName, SegmentCache>>;
}

export interface DescriptorTable {
  readonly base: number;
  readonly limit: number;
}

export interface SystemSelector {
  readonly selector: number;
  readonly base: number;
  readonly limit: number;
  readonly default32: boolean;
  readonly type?: number;
}

export class RebuiltCpuState {
  public readonly registers = new RegisterFile();
  public readonly flags = new Eflags();
  private eip = 0;
  private halted = false;
  private interruptInhibitBoundaries = 0;
  private cr0 = 0x7ffffff0;
  private cr2 = 0;
  private cr3 = 0;
  private readonly debug = new Uint32Array(8);
  private readonly test = new Uint32Array(8);
  private gdtr: DescriptorTable = { base: 0, limit: 0 };
  private idtr: DescriptorTable = { base: 0, limit: 0x3ff };
  private ldtr: SystemSelector = { selector: 0, base: 0, limit: 0, default32: false };
  private tr: SystemSelector = { selector: 0, base: 0, limit: 0, default32: false };
  private segments: Record<SegmentName, SegmentCache> = this.resetSegments();

  public constructor() {
    this.reset();
  }

  public reset(): void {
    this.registers.reset();
    this.flags.reset();
    this.eip = 0x0000fff0;
    this.halted = false;
    this.interruptInhibitBoundaries = 0;
    this.cr0 = 0x7ffffff0;
    this.cr2 = 0;
    this.cr3 = 0;
    this.debug.fill(0);
    this.test.fill(0);
    this.gdtr = { base: 0, limit: 0 };
    this.idtr = { base: 0, limit: 0x3ff };
    this.ldtr = { selector: 0, base: 0, limit: 0, default32: false };
    this.tr = { selector: 0, base: 0, limit: 0, default32: false };
    this.segments = this.resetSegments();
  }

  public snapshot(): RebuiltCpuSnapshot {
    return {
      registers: this.registers.snapshot(),
      eip: this.eip,
      eflags: this.flags.read(),
      halted: this.halted,
      interruptInhibitBoundaries: this.interruptInhibitBoundaries,
      maskableInterruptsInhibited: this.maskableInterruptsInhibited(),
      cr0: this.cr0,
      cr2: this.cr2,
      cr3: this.cr3,
      debug: Array.from(this.debug),
      test: Array.from(this.test),
      gdtr: { ...this.gdtr },
      idtr: { ...this.idtr },
      ldtr: { ...this.ldtr },
      tr: { ...this.tr },
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

  /** Restores a previously captured project-native CPU state. */
  public restore(snapshot: RebuiltCpuSnapshot): void {
    if (
      !Number.isInteger(snapshot.interruptInhibitBoundaries) ||
      snapshot.interruptInhibitBoundaries < 0
    )
      throw new RangeError("Interrupt inhibition boundary count must be non-negative");
    this.registers.restore(snapshot.registers);
    this.flags.write(snapshot.eflags);
    this.eip = snapshot.eip >>> 0;
    this.halted = snapshot.halted;
    this.interruptInhibitBoundaries = snapshot.interruptInhibitBoundaries;
    this.cr0 = snapshot.cr0 >>> 0;
    this.cr2 = snapshot.cr2 >>> 0;
    this.cr3 = snapshot.cr3 & 0xfffff000;
    this.debug.set(snapshot.debug);
    this.test.set(snapshot.test);
    this.gdtr = validateDescriptorTable(snapshot.gdtr);
    this.idtr = validateDescriptorTable(snapshot.idtr);
    this.ldtr = validateSystemSelector(snapshot.ldtr);
    this.tr = validateSystemSelector(snapshot.tr);
    this.segments = {
      cs: cloneSegment(snapshot.segments.cs),
      ds: cloneSegment(snapshot.segments.ds),
      es: cloneSegment(snapshot.segments.es),
      ss: cloneSegment(snapshot.segments.ss),
      fs: cloneSegment(snapshot.segments.fs),
      gs: cloneSegment(snapshot.segments.gs)
    };
  }

  public readEip(): number {
    return this.eip;
  }

  /** Returns the current CS selector without cloning its hidden cache. */
  public readCodeSelector(): number {
    return this.segments.cs.selector;
  }

  public writeEip(value: number): void {
    this.eip = value >>> 0;
  }

  public advanceEip(bytes: number): void {
    const next = (this.eip + bytes) >>> 0;
    this.eip = this.codeDefault32() ? next : next & 0xffff;
  }

  public isVirtual8086(): boolean {
    return Boolean((this.cr0 & 1) !== 0 && (this.flags.read() & 0x00020000) !== 0);
  }

  public codeDefault32(): boolean {
    return !this.isVirtual8086() && this.segments.cs.default32;
  }

  public stackDefault32(): boolean {
    return !this.isVirtual8086() && this.segments.ss.default32;
  }

  public halt(): void {
    this.halted = true;
  }

  public resume(): void {
    this.halted = false;
  }

  public isHalted(): boolean {
    return this.halted;
  }

  public inhibitMaskableInterruptsForNextInstruction(): void {
    this.interruptInhibitBoundaries = 2;
  }

  public completeInstructionBoundary(): void {
    if (this.interruptInhibitBoundaries > 0) this.interruptInhibitBoundaries -= 1;
  }

  public maskableInterruptsInhibited(): boolean {
    return this.interruptInhibitBoundaries > 0;
  }

  public readSegment(name: SegmentName): SegmentCache {
    return cloneSegment(this.segments[name]);
  }

  /** @internal Returns the immutable CPU-owned segment cache without cloning. */
  public segmentCache(name: SegmentName): Readonly<SegmentCache> {
    return this.segments[name];
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

  public readCr2(): number {
    return this.cr2;
  }
  public writeCr2(value: number): void {
    this.cr2 = value >>> 0;
  }
  public readCr3(): number {
    return this.cr3;
  }
  public writeCr3(value: number): void {
    this.cr3 = value & 0xfffff000;
  }
  public readDebug(index: number): number {
    return this.debug[this.assertDebugIndex(index)]!;
  }
  public writeDebug(index: number, value: number): void {
    this.debug[this.assertDebugIndex(index)] = value >>> 0;
  }
  public readTest(index: number): number {
    return this.test[this.assertTestIndex(index)]!;
  }
  public writeTest(index: number, value: number): void {
    this.test[this.assertTestIndex(index)] = value >>> 0;
  }

  public readGdtr(): DescriptorTable {
    return { ...this.gdtr };
  }

  public writeGdtr(table: DescriptorTable): void {
    this.gdtr = validateDescriptorTable(table);
  }

  public readIdtr(): DescriptorTable {
    return { ...this.idtr };
  }

  public writeIdtr(table: DescriptorTable): void {
    this.idtr = validateDescriptorTable(table);
  }

  public readLdtr(): SystemSelector {
    return { ...this.ldtr };
  }
  public writeLdtr(value: SystemSelector): void {
    this.ldtr = validateSystemSelector(value);
  }
  public readTr(): SystemSelector {
    return { ...this.tr };
  }
  public writeTr(value: SystemSelector): void {
    this.tr = validateSystemSelector(value);
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

  private assertDebugIndex(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index > 7)
      throw new RangeError("Invalid debug register index");
    return index;
  }

  private assertTestIndex(index: number): number {
    if (index !== 6 && index !== 7) throw new RangeError("Invalid test register index");
    return index;
  }
}

function validateDescriptorTable(table: DescriptorTable): DescriptorTable {
  if (!Number.isSafeInteger(table.base) || table.base < 0 || table.base > 0xffffffff)
    throw new RangeError("Descriptor table base must be a 32-bit unsigned address");
  if (!Number.isSafeInteger(table.limit) || table.limit < 0 || table.limit > 0xffff)
    throw new RangeError("Descriptor table limit must be a 16-bit unsigned value");
  return { base: table.base >>> 0, limit: table.limit };
}

function validateSystemSelector(value: SystemSelector): SystemSelector {
  if (
    !Number.isSafeInteger(value.selector) ||
    !Number.isSafeInteger(value.base) ||
    !Number.isSafeInteger(value.limit)
  )
    throw new RangeError("System selector values must be integers");
  const result: SystemSelector = {
    selector: value.selector & 0xffff,
    base: value.base >>> 0,
    limit: value.limit >>> 0,
    default32: value.default32
  };
  if (value.type !== undefined) return { ...result, type: value.type };
  return result;
}
