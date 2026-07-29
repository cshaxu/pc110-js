import type { CpuAddressMode } from "../../memory/address-translation.js";
import {
  loadSelectorDescriptor,
  type DescriptorMemory,
  type DescriptorTables,
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
    tables?: DescriptorTables
  ): LoadedSegment {
    if (mode === "real" || mode === "virtual-8086") {
      this.loaded = { selector: selector & 0xffff, base: (selector & 0xffff) << 4, limit: 0xffff };
      return this.snapshot();
    }
    if (!memory || !tables)
      throw new Error("Protected-mode segment load requires descriptor memory and tables");
    const descriptor = loadSelectorDescriptor(memory, tables, selector);
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
