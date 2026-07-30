import type { SegmentedMemory } from "../memory/segmented-memory.js";
import type { RebuiltCpuState } from "../state/cpu-state.js";
import type { SegmentName } from "../state/segments.js";
import { readGdtDescriptor } from "./descriptor.js";

export class SegmentLoadError extends Error {}

export function loadDataSegment(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  name: Exclude<SegmentName, "cs" | "ss">,
  selector: number
): void {
  load(memory, state, name, selector, false);
}

export function loadStackSegment(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  selector: number
): void {
  load(memory, state, "ss", selector, true);
}

export function loadCodeSegment(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  selector: number
): void {
  selector &= 0xffff;
  if (!(state.readCr0() & 1)) return load(memory, state, "cs", selector, false);
  const descriptor = readGdtDescriptor(
    { readUint8: (address) => memory.readPhysical8(address), writeUint8: () => undefined },
    state.readGdtr(),
    selector
  );
  const cpl = currentPrivilege(state);
  const conforming = Boolean(descriptor.type & 4);
  if (!descriptor.system || !(descriptor.type & 8) || !descriptor.present)
    throw new SegmentLoadError("Selector does not identify a present code segment");
  if (conforming ? descriptor.dpl > cpl : descriptor.dpl !== cpl || (selector & 3) > cpl)
    throw new SegmentLoadError("Selected code segment violates privilege rules");
  state.writeSegment("cs", {
    selector: (selector & 0xfffc) | cpl,
    base: descriptor.base,
    limit: descriptor.limit,
    default32: descriptor.default32,
    valid: true,
    dpl: descriptor.dpl
  });
}

function load(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  name: SegmentName,
  selector: number,
  stack: boolean
): void {
  selector &= 0xffff;
  if (!(state.readCr0() & 1)) {
    state.writeSegment(name, {
      selector,
      base: selector << 4,
      limit: 0xffff,
      default32: false,
      valid: true,
      dpl: 0
    });
    return;
  }
  if ((selector & 0xfffc) === 0) {
    if (stack) throw new SegmentLoadError("SS cannot receive a null selector");
    state.writeSegment(name, {
      selector,
      base: 0,
      limit: 0,
      default32: false,
      valid: false,
      dpl: 0
    });
    return;
  }
  const descriptor = readGdtDescriptor(
    { readUint8: (address) => memory.readPhysical8(address), writeUint8: () => undefined },
    state.readGdtr(),
    selector
  );
  const cpl = currentPrivilege(state);
  const rpl = selector & 3;
  const executable = Boolean(descriptor.type & 8);
  const writable = Boolean(descriptor.type & 2);
  if (!descriptor.system || (stack ? executable || !writable : executable && !writable))
    throw new SegmentLoadError("Selector does not identify a compatible data segment");
  if (!descriptor.present) throw new SegmentLoadError("Selected segment is not present");
  if (stack ? rpl !== cpl || descriptor.dpl !== cpl : Math.max(cpl, rpl) > descriptor.dpl)
    throw new SegmentLoadError("Selected segment violates privilege rules");
  state.writeSegment(name, {
    selector,
    base: descriptor.base,
    limit: descriptor.limit,
    default32: descriptor.default32,
    valid: true,
    dpl: descriptor.dpl
  });
}

function currentPrivilege(state: RebuiltCpuState): number {
  const codeSegment = state.readSegment("cs");
  return codeSegment.dpl ?? codeSegment.selector & 3;
}
