export type GeneralRegister = "eax" | "ebx" | "ecx" | "edx" | "esp" | "ebp" | "esi" | "edi";
export type LoadableSegment = "es" | "ss" | "ds" | "fs" | "gs";

const GENERAL_REGISTER_ORDER: readonly GeneralRegister[] = [
  "eax",
  "ecx",
  "edx",
  "ebx",
  "esp",
  "ebp",
  "esi",
  "edi"
];

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
  readonly halted: boolean;
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
const CR0_MSW_ALWAYS_ON = 0x0000fff0;
const CR0_PROTECTED_MODE = 0x00000001;
const EFLAGS_STATUS_MASK = 0x000000d5;
const EFLAGS_INTERRUPT_ENABLE = 0x00000200;
const EFLAGS_DIRECTION = 0x00000400;
const EFLAGS_VIRTUAL_8086 = 0x00020000;
const EFLAGS_LOGIC_MASK = 0x000008c5;
const EFLAGS_ARITHMETIC_MASK = 0x000008d5;
const EFLAGS_CARRY = 0x00000001;
const EFLAGS_AUXILIARY_CARRY = 0x00000010;
const EFLAGS_PARITY = 0x00000004;
const EFLAGS_ZERO = 0x00000040;
const EFLAGS_SIGN = 0x00000080;
const EFLAGS_OVERFLOW = 0x00000800;
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
  private halted = false;
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
    this.halted = false;
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
      halted: this.halted,
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

  public writeCr0(value: number): void {
    this.cr0 = value >>> 0;
  }

  public loadMachineStatusWord(value: number): void {
    const machineStatusWord =
      (value | (this.cr0 & CR0_PROTECTED_MODE) | CR0_MSW_ALWAYS_ON) & 0xffff;
    this.cr0 = ((this.cr0 & 0xffff0000) | machineStatusWord) >>> 0;
  }

  public writeEflags(value: number): void {
    this.eflags = (value | RESET_EFLAGS) >>> 0;
  }

  public writeStatusFlagsFromAh(value: number): void {
    this.eflags =
      ((this.eflags & ~EFLAGS_STATUS_MASK) | (value & EFLAGS_STATUS_MASK) | RESET_EFLAGS) >>> 0;
  }

  public clearInterruptFlag(): void {
    this.eflags = (this.eflags & ~EFLAGS_INTERRUPT_ENABLE) >>> 0;
  }

  public setInterruptFlag(): void {
    this.eflags = (this.eflags | EFLAGS_INTERRUPT_ENABLE) >>> 0;
  }

  public clearDirectionFlag(): void {
    this.eflags = (this.eflags & ~EFLAGS_DIRECTION) >>> 0;
  }

  public setDirectionFlag(): void {
    this.eflags = (this.eflags | EFLAGS_DIRECTION) >>> 0;
  }

  public directionFlag(): boolean {
    return Boolean(this.eflags & EFLAGS_DIRECTION);
  }

  public writeLogicFlags8(value: number): void {
    const result = value & 0xff;
    let flags = this.eflags & ~EFLAGS_LOGIC_MASK;
    if (result === 0) flags |= EFLAGS_ZERO;
    if (result & 0x80) flags |= EFLAGS_SIGN;
    if (((result & 0xff).toString(2).replace(/0/g, "").length & 1) === 0) flags |= EFLAGS_PARITY;
    this.eflags = (flags | RESET_EFLAGS) >>> 0;
  }

  public zeroFlag(): boolean {
    return Boolean(this.eflags & EFLAGS_ZERO);
  }

  public carryFlag(): boolean {
    return Boolean(this.eflags & EFLAGS_CARRY);
  }

  public clearCarryFlag(): void {
    this.eflags = (this.eflags & ~EFLAGS_CARRY) >>> 0;
  }

  public setCarryFlag(): void {
    this.eflags = (this.eflags | EFLAGS_CARRY) >>> 0;
  }

  public advanceEip(bytes: number): void {
    const advanced = (this.eip + bytes) >>> 0;
    this.eip =
      !(this.cr0 & CR0_PROTECTED_MODE) || this.eflags & EFLAGS_VIRTUAL_8086
        ? advanced & 0xffff
        : advanced;
  }

  public writeEip16(value: number): void {
    this.eip = value & 0xffff;
  }

  public writeRegister(index: number, value: number): void {
    const register = this.generalRegisterAt(index);
    this.registers[register] = value >>> 0;
  }

  public writeRegister16(index: number, value: number): void {
    const register = this.generalRegisterAt(index);
    this.registers[register] = ((this.registers[register] & 0xffff0000) | (value & 0xffff)) >>> 0;
  }

  public readRegister16(index: number): number {
    return this.registers[this.generalRegisterAt(index)] & 0xffff;
  }

  public readRegister8(index: number): number {
    const register = this.generalRegisterAt(index & 0x03);
    return (this.registers[register] >>> (index < 4 ? 0 : 8)) & 0xff;
  }

  public writeRegister8(index: number, value: number): void {
    const normalizedValue = value & 0xff;
    const registerIndex = index & 0x03;
    const register = this.generalRegisterAt(registerIndex);
    const shift = index < 4 ? 0 : 8;
    const mask = ~(0xff << shift);
    this.registers[register] =
      ((this.registers[register] & mask) | (normalizedValue << shift)) >>> 0;
  }

  public writeLogicFlags16(value: number): void {
    const result = value & 0xffff;
    let flags = this.eflags & ~EFLAGS_LOGIC_MASK;
    if (result === 0) flags |= EFLAGS_ZERO;
    if (result & 0x8000) flags |= EFLAGS_SIGN;
    if (((result & 0xff).toString(2).replace(/0/g, "").length & 1) === 0) flags |= EFLAGS_PARITY;
    this.eflags = (flags | RESET_EFLAGS) >>> 0;
  }

  public writeCompareFlags8(left: number, right: number): void {
    const leftByte = left & 0xff;
    const rightByte = right & 0xff;
    const result = (leftByte - rightByte) & 0xff;
    let flags = this.eflags & ~EFLAGS_ARITHMETIC_MASK;
    if (leftByte < rightByte) flags |= EFLAGS_CARRY;
    if ((leftByte ^ rightByte ^ result) & 0x10) flags |= EFLAGS_AUXILIARY_CARRY;
    if (result === 0) flags |= EFLAGS_ZERO;
    if (result & 0x80) flags |= EFLAGS_SIGN;
    if (((result & 0xff).toString(2).replace(/0/g, "").length & 1) === 0) flags |= EFLAGS_PARITY;
    if ((leftByte ^ rightByte) & (leftByte ^ result) & 0x80) flags |= EFLAGS_OVERFLOW;
    this.eflags = (flags | RESET_EFLAGS) >>> 0;
  }

  public writeAddFlags8(left: number, right: number, carry = 0): void {
    const leftByte = left & 0xff;
    const rightByte = right & 0xff;
    const effectiveRight = (rightByte + carry) & 0xff;
    const sum = leftByte + rightByte + carry;
    const result = sum & 0xff;
    let flags = this.eflags & ~EFLAGS_ARITHMETIC_MASK;
    if (sum > 0xff) flags |= EFLAGS_CARRY;
    if ((leftByte ^ effectiveRight ^ result) & 0x10) flags |= EFLAGS_AUXILIARY_CARRY;
    if (result === 0) flags |= EFLAGS_ZERO;
    if (result & 0x80) flags |= EFLAGS_SIGN;
    if (((result & 0xff).toString(2).replace(/0/g, "").length & 1) === 0) flags |= EFLAGS_PARITY;
    if (~(leftByte ^ effectiveRight) & (leftByte ^ result) & 0x80) flags |= EFLAGS_OVERFLOW;
    this.eflags = (flags | RESET_EFLAGS) >>> 0;
  }

  public writeMultiplyFlags16(highWord: number): void {
    let flags = this.eflags & ~(EFLAGS_CARRY | EFLAGS_OVERFLOW);
    if ((highWord & 0xffff) !== 0) flags |= EFLAGS_CARRY | EFLAGS_OVERFLOW;
    this.eflags = (flags | RESET_EFLAGS) >>> 0;
  }

  public writeCompareFlags16(left: number, right: number): void {
    const leftWord = left & 0xffff;
    const rightWord = right & 0xffff;
    const result = (leftWord - rightWord) & 0xffff;
    let flags = this.eflags & ~EFLAGS_ARITHMETIC_MASK;
    if (leftWord < rightWord) flags |= EFLAGS_CARRY;
    if ((leftWord ^ rightWord ^ result) & 0x10) flags |= EFLAGS_AUXILIARY_CARRY;
    if (result === 0) flags |= EFLAGS_ZERO;
    if (result & 0x8000) flags |= EFLAGS_SIGN;
    if (((result & 0xff).toString(2).replace(/0/g, "").length & 1) === 0) flags |= EFLAGS_PARITY;
    if ((leftWord ^ rightWord) & (leftWord ^ result) & 0x8000) flags |= EFLAGS_OVERFLOW;
    this.eflags = (flags | RESET_EFLAGS) >>> 0;
  }

  public writeAddFlags16(left: number, right: number): void {
    const leftWord = left & 0xffff;
    const rightWord = right & 0xffff;
    const sum = leftWord + rightWord;
    const result = sum & 0xffff;
    let flags = this.eflags & ~EFLAGS_ARITHMETIC_MASK;
    if (sum > 0xffff) flags |= EFLAGS_CARRY;
    if ((leftWord ^ rightWord ^ result) & 0x10) flags |= EFLAGS_AUXILIARY_CARRY;
    if (result === 0) flags |= EFLAGS_ZERO;
    if (result & 0x8000) flags |= EFLAGS_SIGN;
    if (((result & 0xff).toString(2).replace(/0/g, "").length & 1) === 0) flags |= EFLAGS_PARITY;
    if (~(leftWord ^ rightWord) & (leftWord ^ result) & 0x8000) flags |= EFLAGS_OVERFLOW;
    this.eflags = (flags | RESET_EFLAGS) >>> 0;
  }

  public writeIncrementFlags16(value: number): void {
    const source = value & 0xffff;
    const result = (source + 1) & 0xffff;
    let flags = this.eflags & ~(EFLAGS_ARITHMETIC_MASK & ~EFLAGS_CARRY);
    if (source === 0x7fff) flags |= EFLAGS_OVERFLOW;
    if ((source & 0x0f) === 0x0f) flags |= EFLAGS_AUXILIARY_CARRY;
    if (result === 0) flags |= EFLAGS_ZERO;
    if (result & 0x8000) flags |= EFLAGS_SIGN;
    if (((result & 0xff).toString(2).replace(/0/g, "").length & 1) === 0) flags |= EFLAGS_PARITY;
    this.eflags = (flags | RESET_EFLAGS) >>> 0;
  }

  public writeDecrementFlags16(value: number): void {
    const source = value & 0xffff;
    const result = (source - 1) & 0xffff;
    let flags = this.eflags & ~(EFLAGS_ARITHMETIC_MASK & ~EFLAGS_CARRY);
    if (source === 0x8000) flags |= EFLAGS_OVERFLOW;
    if ((source & 0x0f) === 0x00) flags |= EFLAGS_AUXILIARY_CARRY;
    if (result === 0) flags |= EFLAGS_ZERO;
    if (result & 0x8000) flags |= EFLAGS_SIGN;
    if (((result & 0xff).toString(2).replace(/0/g, "").length & 1) === 0) flags |= EFLAGS_PARITY;
    this.eflags = (flags | RESET_EFLAGS) >>> 0;
  }

  public writeShiftLeftFlags8(value: number): void {
    const source = value & 0xff;
    const result = (source << 1) & 0xff;
    const carry = Boolean(source & 0x80);
    let flags = this.eflags & ~EFLAGS_LOGIC_MASK;
    if (carry) flags |= EFLAGS_CARRY;
    if (result === 0) flags |= EFLAGS_ZERO;
    if (result & 0x80) flags |= EFLAGS_SIGN;
    if (((result & 0xff).toString(2).replace(/0/g, "").length & 1) === 0) flags |= EFLAGS_PARITY;
    if (Boolean(result & 0x80) !== carry) flags |= EFLAGS_OVERFLOW;
    this.eflags = (flags | RESET_EFLAGS) >>> 0;
  }

  public writeShiftLeftFlags16(value: number, count: number): void {
    const source = value & 0xffff;
    const normalizedCount = count & 0x1f;
    if (normalizedCount === 0) return;
    const carry = normalizedCount > 16 ? 0 : source << (normalizedCount - 1);
    const result = normalizedCount > 16 ? 0 : (carry << 1) & 0xffff;
    let flags = this.eflags & ~EFLAGS_LOGIC_MASK;
    if (carry & 0x8000) flags |= EFLAGS_CARRY;
    if (result === 0) flags |= EFLAGS_ZERO;
    if (result & 0x8000) flags |= EFLAGS_SIGN;
    if (((result & 0xff).toString(2).replace(/0/g, "").length & 1) === 0) flags |= EFLAGS_PARITY;
    if ((result ^ carry) & 0x8000) flags |= EFLAGS_OVERFLOW;
    this.eflags = (flags | RESET_EFLAGS) >>> 0;
  }

  public writeShiftRightFlags8(value: number, count: number): void {
    const source = value & 0xff;
    const normalizedCount = count & 0x1f;
    if (normalizedCount === 0) return;
    const carry = normalizedCount > 8 ? 0 : source >>> (normalizedCount - 1);
    const result = normalizedCount > 8 ? 0 : (carry >>> 1) & 0xff;
    let flags = this.eflags & ~EFLAGS_LOGIC_MASK;
    if (carry & 0x01) flags |= EFLAGS_CARRY;
    if (result === 0) flags |= EFLAGS_ZERO;
    if (result & 0x80) flags |= EFLAGS_SIGN;
    if (((result & 0xff).toString(2).replace(/0/g, "").length & 1) === 0) flags |= EFLAGS_PARITY;
    if (result & 0x80) flags |= EFLAGS_OVERFLOW;
    this.eflags = (flags | RESET_EFLAGS) >>> 0;
  }

  public writeShiftRightFlags16(value: number, count: number): void {
    const source = value & 0xffff;
    const normalizedCount = count & 0x1f;
    if (normalizedCount === 0) return;
    const carry = normalizedCount > 16 ? 0 : source >>> (normalizedCount - 1);
    const result = normalizedCount > 16 ? 0 : (carry >>> 1) & 0xffff;
    let flags = this.eflags & ~EFLAGS_LOGIC_MASK;
    if (carry & 0x01) flags |= EFLAGS_CARRY;
    if (result === 0) flags |= EFLAGS_ZERO;
    if (result & 0x8000) flags |= EFLAGS_SIGN;
    if (((result & 0xff).toString(2).replace(/0/g, "").length & 1) === 0) flags |= EFLAGS_PARITY;
    if (result & 0x8000) flags |= EFLAGS_OVERFLOW;
    this.eflags = (flags | RESET_EFLAGS) >>> 0;
  }

  public loadRealModeCodeSegment(selector: number, instructionPointer: number): void {
    this.cs = {
      selector: selector & 0xffff,
      base: (selector & 0xffff) << 4,
      limit: this.cs.limit
    };
    this.eip = instructionPointer & 0xffff;
  }

  public loadRealModeSegment(segment: LoadableSegment, selector: number): void {
    const existing = this[segment];
    this[segment] = {
      selector: selector & 0xffff,
      base: (selector & 0xffff) << 4,
      limit: existing.limit
    };
  }

  public halt(): void {
    this.halted = true;
  }

  public resume(): void {
    this.halted = false;
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

  private generalRegisterAt(index: number): GeneralRegister {
    const register = GENERAL_REGISTER_ORDER[index];
    if (!register) throw new RangeError(`Invalid general-register index ${index}`);
    return register;
  }
}
