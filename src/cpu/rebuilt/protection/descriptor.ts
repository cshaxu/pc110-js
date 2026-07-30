import type { RebuiltMemoryBus } from "../memory/segmented-memory.js";
import type { DescriptorTable } from "../state/cpu-state.js";

export interface SegmentDescriptor {
  readonly base: number;
  readonly limit: number;
  readonly type: number;
  readonly system: boolean;
  readonly dpl: number;
  readonly present: boolean;
  readonly default32: boolean;
  readonly granularity: boolean;
}

export class DescriptorLookupError extends Error {
  public constructor(
    readonly selector: number,
    message: string
  ) {
    super(message);
  }
}

export function readGdtDescriptor(
  memory: RebuiltMemoryBus,
  gdtr: DescriptorTable,
  selector: number
): SegmentDescriptor {
  if (selector & 0x0004)
    throw new DescriptorLookupError(selector, "LDT selector is not yet rebuilt");
  const offset = selector & 0xfff8;
  if (offset === 0 || offset + 7 > gdtr.limit)
    throw new DescriptorLookupError(selector, "Selector is outside the GDT limit");
  const address = (gdtr.base + offset) >>> 0;
  const low = read32(memory, address);
  const high = read32(memory, address + 4);
  const limit20 = (low & 0xffff) | (((high >>> 16) & 0x0f) << 16);
  const granularity = Boolean(high & 0x00800000);
  return {
    base: (((low >>> 16) & 0xffff) | ((high & 0xff) << 16) | (high & 0xff000000)) >>> 0,
    limit: granularity ? ((limit20 << 12) | 0xfff) >>> 0 : limit20,
    type: (high >>> 8) & 0x0f,
    system: Boolean(high & 0x00001000),
    dpl: (high >>> 13) & 0x03,
    present: Boolean(high & 0x00008000),
    default32: Boolean(high & 0x00400000),
    granularity
  };
}

function read32(memory: RebuiltMemoryBus, address: number): number {
  return (
    (memory.readUint8(address) |
      (memory.readUint8(address + 1) << 8) |
      (memory.readUint8(address + 2) << 16) |
      (memory.readUint8(address + 3) << 24)) >>>
    0
  );
}
