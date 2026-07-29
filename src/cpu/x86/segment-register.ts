import type { CpuAddressMode } from "./address-translation.js";
import {
  loadDescriptor,
  type DescriptorMemory,
  type DescriptorTable,
  type SegmentAccess,
  type SegmentDescriptor,
  validateDescriptorAccess
} from "./segmentation.js";

export interface LoadedSegment {
  readonly selector: number;
  readonly base: number;
  readonly limit: number;
  readonly descriptor?: SegmentDescriptor;
}

export class SegmentRegister {
  private loaded: LoadedSegment = { selector: 0, base: 0, limit: 0xffff };

  public load(
    mode: CpuAddressMode,
    selector: number,
    access: SegmentAccess,
    cpl: number,
    memory?: DescriptorMemory,
    table?: DescriptorTable
  ): LoadedSegment {
    if (mode === "real" || mode === "virtual-8086") {
      this.loaded = { selector: selector & 0xffff, base: (selector & 0xffff) << 4, limit: 0xffff };
      return this.snapshot();
    }
    if (!memory || !table)
      throw new Error("Protected-mode segment load requires descriptor memory and table");
    const descriptor = loadDescriptor(memory, table, selector);
    validateDescriptorAccess(descriptor, cpl, access);
    this.loaded = {
      selector: descriptor.selector,
      base: descriptor.base,
      limit: descriptor.limit,
      descriptor
    };
    return this.snapshot();
  }

  public snapshot(): LoadedSegment {
    return { ...this.loaded, descriptor: this.loaded.descriptor && { ...this.loaded.descriptor } };
  }
}
