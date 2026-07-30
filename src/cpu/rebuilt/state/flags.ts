export const EFLAGS_ALWAYS_SET = 0x00000002;

export class Eflags {
  private value = EFLAGS_ALWAYS_SET;

  public reset(): void {
    this.value = EFLAGS_ALWAYS_SET;
  }

  public read(): number {
    return this.value;
  }

  public write(value: number): void {
    this.value = (value | EFLAGS_ALWAYS_SET) >>> 0;
  }

  public has(mask: number): boolean {
    return Boolean(this.value & mask);
  }

  public set(mask: number): void {
    this.value = (this.value | mask | EFLAGS_ALWAYS_SET) >>> 0;
  }

  public clear(mask: number): void {
    this.value = ((this.value & ~mask) | EFLAGS_ALWAYS_SET) >>> 0;
  }
}
