import type { SegmentedMemory } from "../memory/segmented-memory.js";
import type { RebuiltCpuState } from "../state/cpu-state.js";
import type { SegmentName } from "../state/segments.js";
import { DescriptorLookupError, readDescriptor } from "./descriptor.js";

export class SegmentLoadError extends Error {
  public constructor(
    readonly vector: 11 | 12 | 13,
    readonly errorCode: number,
    message: string
  ) {
    super(message);
  }
}

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
  if (!(state.readCr0() & 1) || state.isVirtual8086())
    return load(memory, state, "cs", selector, false);
  const descriptor = lookup(memory, state, selector);
  const cpl = currentPrivilege(state);
  const conforming = Boolean(descriptor.type & 4);
  if (!descriptor.system || !(descriptor.type & 8))
    throw fault(13, selector, "Selector does not identify a code segment");
  if (!descriptor.present) throw fault(11, selector, "Selected code segment is not present");
  if (conforming ? descriptor.dpl > cpl : descriptor.dpl !== cpl || (selector & 3) > cpl)
    throw fault(13, selector, "Selected code segment violates privilege rules");
  state.writeSegment("cs", {
    selector: (selector & 0xfffc) | cpl,
    base: descriptor.base,
    limit: descriptor.limit,
    default32: descriptor.default32,
    valid: true,
    dpl: descriptor.dpl,
    executable: true,
    readable: Boolean(descriptor.type & 2),
    writable: false,
    expandDown: false
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
  if (!(state.readCr0() & 1) || state.isVirtual8086()) {
    state.writeSegment(name, {
      selector,
      base: selector << 4,
      limit: 0xffff,
      default32: false,
      valid: true,
      dpl: state.isVirtual8086() ? 3 : 0,
      executable: false,
      readable: true,
      writable: true,
      expandDown: false
    });
    return;
  }
  if ((selector & 0xfffc) === 0) {
    if (stack) throw fault(13, 0, "SS cannot receive a null selector");
    state.writeSegment(name, {
      selector,
      base: 0,
      limit: 0,
      default32: false,
      valid: false,
      dpl: 0,
      executable: false,
      readable: false,
      writable: false,
      expandDown: false
    });
    return;
  }
  const descriptor = lookup(memory, state, selector);
  const cpl = currentPrivilege(state);
  const rpl = selector & 3;
  const executable = Boolean(descriptor.type & 8);
  const writable = Boolean(descriptor.type & 2);
  if (!descriptor.system || (stack ? executable || !writable : executable && !writable))
    throw fault(13, selector, "Selector does not identify a compatible data segment");
  if (!descriptor.present)
    throw fault(stack ? 12 : 11, selector, "Selected segment is not present");
  if (stack ? rpl !== cpl || descriptor.dpl !== cpl : Math.max(cpl, rpl) > descriptor.dpl)
    throw fault(13, selector, "Selected segment violates privilege rules");
  state.writeSegment(name, {
    selector,
    base: descriptor.base,
    limit: descriptor.limit,
    default32: descriptor.default32,
    valid: true,
    dpl: descriptor.dpl,
    executable,
    readable: !executable || Boolean(descriptor.type & 2),
    writable: !executable && writable,
    expandDown: !executable && Boolean(descriptor.type & 4)
  });
}

function lookup(memory: SegmentedMemory, state: RebuiltCpuState, selector: number) {
  try {
    return readDescriptor(
      { readUint8: (address) => memory.readPhysical8(address), writeUint8: () => undefined },
      state,
      selector
    );
  } catch (error) {
    if (error instanceof DescriptorLookupError)
      throw fault(13, selector, "Selector is outside the descriptor table");
    throw error;
  }
}

function fault(vector: 11 | 12 | 13, errorCode: number, message: string): SegmentLoadError {
  return new SegmentLoadError(vector, errorCode & 0xffff, message);
}

function currentPrivilege(state: RebuiltCpuState): number {
  const codeSegment = state.readSegment("cs");
  return codeSegment.dpl ?? codeSegment.selector & 3;
}
