export interface DescriptorMemory {
  readUint32(address: number): number;
}

export interface DescriptorTable {
  readonly base: number;
  readonly limit: number;
}

export interface SegmentDescriptor {
  readonly selector: number;
  readonly base: number;
  readonly limit: number;
  readonly type: number;
  readonly system: boolean;
  readonly dpl: number;
  readonly present: boolean;
  readonly available: boolean;
  readonly default32: boolean;
  readonly granularityPages: boolean;
}

export class SegmentDescriptorError extends Error {}

export function loadDescriptor(
  memory: DescriptorMemory,
  table: DescriptorTable,
  selector: number
): SegmentDescriptor {
  const index = selector & 0xfff8;
  if (index === 0) throw new SegmentDescriptorError("Null selector has no loadable descriptor");
  if (index + 7 > table.limit)
    throw new SegmentDescriptorError("Selector exceeds descriptor table limit");

  const address = (table.base + index) >>> 0;
  const low = memory.readUint32(address) >>> 0;
  const high = memory.readUint32(address + 4) >>> 0;
  const access = (high >>> 8) & 0xff;
  const flags = (high >>> 20) & 0x0f;
  let limit = (low & 0xffff) | (((high >>> 16) & 0x0f) << 16);
  const granularityPages = Boolean(flags & 0x8);
  if (granularityPages) limit = ((limit << 12) | 0xfff) >>> 0;

  return {
    selector: selector & 0xffff,
    base: (((low >>> 16) & 0xffff) | ((high & 0xff) << 16) | (high & 0xff000000)) >>> 0,
    limit: limit >>> 0,
    type: access & 0x0f,
    system: Boolean(access & 0x10),
    dpl: (access >>> 5) & 0x03,
    present: Boolean(access & 0x80),
    available: Boolean(flags & 0x1),
    default32: Boolean(flags & 0x4),
    granularityPages
  };
}
