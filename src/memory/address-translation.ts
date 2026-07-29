export const CR0_PROTECTED_MODE = 0x00000001;
export const CR0_PAGING = 0x80000000;
export const EFLAGS_VIRTUAL_8086 = 0x00020000;

export type CpuAddressMode = "real" | "protected" | "virtual-8086";

export interface CachedSegment {
  readonly selector: number;
  readonly base: number;
  readonly limit: number;
  readonly present: boolean;
}

export interface PageTableMemory {
  readUint32(address: number): number;
  writeUint32(address: number, value: number): void;
}

export interface PagingAccess {
  readonly write: boolean;
  readonly user: boolean;
}

export class AddressTranslationError extends Error {}

export class PageFaultError extends AddressTranslationError {
  public constructor(
    readonly linearAddress: number,
    readonly present: boolean,
    readonly access: PagingAccess,
    message: string
  ) {
    super(message);
  }
}

export function addressMode(cr0: number, eflags: number): CpuAddressMode {
  if (!(cr0 & CR0_PROTECTED_MODE)) return "real";
  return eflags & EFLAGS_VIRTUAL_8086 ? "virtual-8086" : "protected";
}

export function translateSegmentOffset(
  mode: CpuAddressMode,
  segment: CachedSegment,
  offset: number
): number {
  const unsignedOffset = offset >>> 0;
  if (mode === "real" || mode === "virtual-8086") {
    if (unsignedOffset > 0xffff)
      throw new AddressTranslationError("Real-mode offset exceeds 16 bits");
    return ((segment.selector << 4) + unsignedOffset) >>> 0;
  }
  if (!segment.present) throw new AddressTranslationError("Protected-mode segment is not present");
  if (unsignedOffset > segment.limit)
    throw new AddressTranslationError("Protected-mode segment limit exceeded");
  return (segment.base + unsignedOffset) >>> 0;
}

export function translateLinearAddress(
  memory: PageTableMemory,
  cr0: number,
  cr3: number,
  linearAddress: number,
  access: PagingAccess
): number {
  const linear = linearAddress >>> 0;
  if (!(cr0 & CR0_PAGING)) return linear;

  const directoryAddress = ((cr3 & 0xfffff000) + (((linear >>> 22) & 0x3ff) << 2)) >>> 0;
  const directoryEntry = memory.readUint32(directoryAddress) >>> 0;
  validatePageEntry(linear, directoryEntry, access, "directory");
  memory.writeUint32(directoryAddress, directoryEntry | 0x20);

  const tableAddress = ((directoryEntry & 0xfffff000) + (((linear >>> 12) & 0x3ff) << 2)) >>> 0;
  const tableEntry = memory.readUint32(tableAddress) >>> 0;
  validatePageEntry(linear, tableEntry, access, "table");
  memory.writeUint32(tableAddress, tableEntry | 0x20 | (access.write ? 0x40 : 0));
  return ((tableEntry & 0xfffff000) + (linear & 0xfff)) >>> 0;
}

function validatePageEntry(
  linear: number,
  entry: number,
  access: PagingAccess,
  level: string
): void {
  if (!(entry & 0x1)) {
    throw new PageFaultError(linear, false, access, `Page ${level} entry is not present`);
  }
  if (access.user && !(entry & 0x4))
    throw new PageFaultError(linear, true, access, `Page ${level} entry denies user access`);
  if (access.write && access.user && !(entry & 0x2))
    throw new PageFaultError(linear, true, access, `Page ${level} entry denies write access`);
}
