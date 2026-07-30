import type { PortWidth } from "../io/port-bus.js";
import type { SegmentedMemory } from "../memory/segmented-memory.js";
import type { RebuiltCpuState } from "../state/cpu-state.js";

export class RebuiltIoPermissionError extends Error {
  public constructor() {
    super("Protected-mode I/O permission denied");
  }
}

export function assertIoPermission(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  port: number,
  width: PortWidth
): void {
  // TODO(High): NXVM leaves _kpa_test_iomap TODO; retain this independently
  // tested project-native bitmap behavior as a reviewable compatibility boundary.
  if (!(state.readCr0() & 1)) return;
  const iopl = (state.flags.read() >>> 12) & 3;
  const virtual8086 = state.isVirtual8086();
  const code = state.readSegment("cs");
  const cpl = virtual8086 ? 3 : (code.dpl ?? code.selector & 3);
  if (!virtual8086 && cpl <= iopl) return;
  if (virtual8086 && iopl === 3) return;

  const tr = state.readTr();
  if ((tr.selector & 0xfff8) === 0 || (tr.type !== 9 && tr.type !== 11))
    throw new RebuiltIoPermissionError();
  if (tr.limit < 103) throw new RebuiltIoPermissionError();
  const bitmapOffset = memory.readLinear8(tr.base + 102) | (memory.readLinear8(tr.base + 103) << 8);
  const bytes = width / 8;
  for (let offset = 0; offset < bytes; offset += 1) {
    const currentPort = port + offset;
    if (currentPort > 0xffff) throw new RebuiltIoPermissionError();
    const bitmapByte = bitmapOffset + (currentPort >>> 3);
    if (bitmapByte > tr.limit) throw new RebuiltIoPermissionError();
    if (memory.readLinear8(tr.base + bitmapByte) & (1 << (currentPort & 7)))
      throw new RebuiltIoPermissionError();
  }
}
