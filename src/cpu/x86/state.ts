export type GeneralRegister = "eax" | "ebx" | "ecx" | "edx" | "esp" | "ebp" | "esi" | "edi";

export interface SegmentState {
  readonly selector: number;
  readonly base: number;
  readonly limit: number;
}

export interface DescriptorTableState {
  readonly base: number;
  readonly limit: number;
}

export interface Cpu386Snapshot {
  readonly registers: Readonly<Record<GeneralRegister, number>>;
  readonly eip: number;
  readonly eflags: number;
  readonly cr0: number;
  readonly cr2: number;
  readonly cr3: number;
  readonly gdtr: DescriptorTableState;
  readonly idtr: DescriptorTableState;
  readonly cs: SegmentState;
  readonly ds: SegmentState;
  readonly es: SegmentState;
  readonly ss: SegmentState;
  readonly fs: SegmentState;
  readonly gs: SegmentState;
}

const RESET_CR0 = 0x7ffffff0;
const RESET_EFLAGS = 0x00000002;
const REAL_MODE_SEGMENT: SegmentState = { selector: 0, base: 0, limit: 0xffff };
const RESET_CS: SegmentState = { selector: 0xf000, base: 0xffff0000, limit: 0xffff };

function cloneSegment(segment: SegmentState): SegmentState {
  return { ...segment };
}

function cloneDescriptorTable(table: DescriptorTableState): DescriptorTableState {
  return { ...table };
}

export class Cpu386State {
  private registers: Record<GeneralRegister, number> = this.emptyRegisters();
  private eip = 0;
  private eflags = RESET_EFLAGS;
  private cr0 = RESET_CR0;
  private cr2 = 0;
  private cr3 = 0;
  private gdtr: DescriptorTableState = { base: 0, limit: 0 };
  private idtr: DescriptorTableState = { base: 0, limit: 0x3ff };
  private cs: SegmentState = cloneSegment(RESET_CS);
  private ds: SegmentState = cloneSegment(REAL_MODE_SEGMENT);
  private es: SegmentState = cloneSegment(REAL_MODE_SEGMENT);
  private ss: SegmentState = cloneSegment(REAL_MODE_SEGMENT);
  private fs: SegmentState = cloneSegment(REAL_MODE_SEGMENT);
  private gs: SegmentState = cloneSegment(REAL_MODE_SEGMENT);

  public constructor() {
    this.reset();
  }

  public reset(): void {
    this.registers = this.emptyRegisters();
    this.registers.edx = 0x00000300;
    this.eip = 0x0000fff0;
    this.eflags = RESET_EFLAGS;
    this.cr0 = RESET_CR0;
    this.cr2 = 0;
    this.cr3 = 0;
    this.gdtr = { base: 0, limit: 0 };
    this.idtr = { base: 0, limit: 0x3ff };
    this.cs = cloneSegment(RESET_CS);
    this.ds = cloneSegment(REAL_MODE_SEGMENT);
    this.es = cloneSegment(REAL_MODE_SEGMENT);
    this.ss = cloneSegment(REAL_MODE_SEGMENT);
    this.fs = cloneSegment(REAL_MODE_SEGMENT);
    this.gs = cloneSegment(REAL_MODE_SEGMENT);
  }

  public snapshot(): Cpu386Snapshot {
    return {
      registers: { ...this.registers },
      eip: this.eip,
      eflags: this.eflags,
      cr0: this.cr0,
      cr2: this.cr2,
      cr3: this.cr3,
      gdtr: cloneDescriptorTable(this.gdtr),
      idtr: cloneDescriptorTable(this.idtr),
      cs: cloneSegment(this.cs),
      ds: cloneSegment(this.ds),
      es: cloneSegment(this.es),
      ss: cloneSegment(this.ss),
      fs: cloneSegment(this.fs),
      gs: cloneSegment(this.gs)
    };
  }

  public writeCr3(value: number): void {
    this.cr3 = value & 0xfffff000;
  }

  public writeGdtr(base: number, limit: number): void {
    this.gdtr = { base: base >>> 0, limit: limit & 0xffff };
  }

  public writeIdtr(base: number, limit: number): void {
    this.idtr = { base: base >>> 0, limit: limit & 0xffff };
  }

  public recordPageFault(linearAddress: number): void {
    this.cr2 = linearAddress >>> 0;
  }

  private emptyRegisters(): Record<GeneralRegister, number> {
    return { eax: 0, ebx: 0, ecx: 0, edx: 0, esp: 0, ebp: 0, esi: 0, edi: 0 };
  }
}
