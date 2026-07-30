export type GeneralRegisterName = "eax" | "ecx" | "edx" | "ebx" | "esp" | "ebp" | "esi" | "edi";

const REGISTER_NAMES: readonly GeneralRegisterName[] = [
  "eax",
  "ecx",
  "edx",
  "ebx",
  "esp",
  "ebp",
  "esi",
  "edi"
];

export type RegisterFileSnapshot = Readonly<Record<GeneralRegisterName, number>>;

export class RegisterFile {
  private readonly values = new Uint32Array(8);

  public reset(): void {
    this.values.fill(0);
    this.values[2] = 0x00000300;
  }

  public read32(index: number): number {
    return this.values[this.assertIndex(index)]!;
  }

  public write32(index: number, value: number): void {
    this.values[this.assertIndex(index)] = value >>> 0;
  }

  public read16(index: number): number {
    return this.read32(index) & 0xffff;
  }

  public write16(index: number, value: number): void {
    const resolved = this.assertIndex(index);
    this.values[resolved] = ((this.values[resolved]! & 0xffff0000) | (value & 0xffff)) >>> 0;
  }

  public read8(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index > 7) {
      throw new RangeError(`Invalid 8-bit register index ${index}`);
    }
    const resolved = index & 0x03;
    return (this.values[resolved]! >>> (index < 4 ? 0 : 8)) & 0xff;
  }

  public write8(index: number, value: number): void {
    if (!Number.isInteger(index) || index < 0 || index > 7) {
      throw new RangeError(`Invalid 8-bit register index ${index}`);
    }
    const resolved = index & 0x03;
    const shift = index < 4 ? 0 : 8;
    const mask = ~(0xff << shift);
    this.values[resolved] = ((this.values[resolved]! & mask) | ((value & 0xff) << shift)) >>> 0;
  }

  public snapshot(): RegisterFileSnapshot {
    return Object.fromEntries(
      REGISTER_NAMES.map((name, index) => [name, this.values[index]!])
    ) as RegisterFileSnapshot;
  }

  private assertIndex(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index >= REGISTER_NAMES.length) {
      throw new RangeError(`Invalid general-register index ${index}`);
    }
    return index;
  }
}
