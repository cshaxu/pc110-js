export interface DescriptorMemory {
  readUint32(address: number): number;
}

export interface DescriptorTable {
  readonly base: number;
  readonly limit: number;
}

export interface DescriptorTables {
  readonly gdt: DescriptorTable;
  readonly ldt?: DescriptorTable;
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

export type SegmentAccess = "read" | "write" | "execute";

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

export function loadSelectorDescriptor(
  memory: DescriptorMemory,
  tables: DescriptorTables,
  selector: number
): SegmentDescriptor {
  if (selector & 0x04) {
    if (!tables.ldt) throw new SegmentDescriptorError("Selector requires an unavailable LDT");
    return loadDescriptor(memory, tables.ldt, selector);
  }
  return loadDescriptor(memory, tables.gdt, selector);
}

export function validateDescriptorAccess(
  descriptor: SegmentDescriptor,
  cpl: number,
  access: SegmentAccess
): void {
  if (!descriptor.present) throw new SegmentDescriptorError("Segment is not present");
  if (!descriptor.system)
    throw new SegmentDescriptorError("Descriptor is not a code or data segment");

  const rpl = descriptor.selector & 0x03;
  const isCode = Boolean(descriptor.type & 0x08);
  const readableOrWritable = Boolean(descriptor.type & 0x02);
  const conformingOrExpandDown = Boolean(descriptor.type & 0x04);

  if (isCode) {
    if (access === "write") throw new SegmentDescriptorError("Code segments are not writable");
    if (access === "read" && !readableOrWritable)
      throw new SegmentDescriptorError("Code segment is execute-only");
    if (conformingOrExpandDown) {
      if (cpl < descriptor.dpl)
        throw new SegmentDescriptorError("Conforming code privilege violation");
    } else if (cpl !== descriptor.dpl || rpl > cpl) {
      throw new SegmentDescriptorError("Non-conforming code privilege violation");
    }
    return;
  }

  if (access === "execute") throw new SegmentDescriptorError("Data segments are not executable");
  if (access === "write" && !readableOrWritable)
    throw new SegmentDescriptorError("Data segment is read-only");
  if (Math.max(cpl, rpl) > descriptor.dpl)
    throw new SegmentDescriptorError("Data segment privilege violation");
}

export function validateDescriptorOffset(descriptor: SegmentDescriptor, offset: number): void {
  const unsignedOffset = offset >>> 0;
  const isCode = Boolean(descriptor.type & 0x08);
  const expandDown = !isCode && Boolean(descriptor.type & 0x04);
  if (!expandDown && unsignedOffset > descriptor.limit) {
    throw new SegmentDescriptorError("Segment limit exceeded");
  }
  if (expandDown) {
    const upperBound = descriptor.default32 ? 0xffffffff : 0xffff;
    if (unsignedOffset <= descriptor.limit || unsignedOffset > upperBound) {
      throw new SegmentDescriptorError("Expand-down segment limit exceeded");
    }
  }
}
