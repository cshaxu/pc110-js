import {
  PageFaultError,
  type PageTableMemory,
  type PagingAccess,
  translateLinearAddress
} from "./address-translation.js";
import type { Cpu386State } from "./state.js";

interface CachedTranslation {
  readonly physicalPage: number;
}

export class PagingTranslator {
  private readonly cache = new Map<string, CachedTranslation>();
  private cr3 = 0;

  public constructor(
    private readonly memory: PageTableMemory,
    private readonly state: Cpu386State,
    private readonly cr0: number
  ) {}

  public writeCr3(value: number): void {
    this.cr3 = value & 0xfffff000;
    this.state.writeCr3(this.cr3);
    this.cache.clear();
  }

  public translate(linearAddress: number, access: PagingAccess): number {
    const linear = linearAddress >>> 0;
    const key = `${this.cr3}:${linear >>> 12}:${access.user ? 1 : 0}:${access.write ? 1 : 0}`;
    const cached = this.cache.get(key);
    if (cached) return (cached.physicalPage + (linear & 0xfff)) >>> 0;
    try {
      const physical = translateLinearAddress(this.memory, this.cr0, this.cr3, linear, access);
      this.cache.set(key, { physicalPage: physical & 0xfffff000 });
      return physical;
    } catch (error) {
      if (error instanceof PageFaultError) this.state.recordPageFault(error.linearAddress);
      throw error;
    }
  }
}
