import type { OperandSize } from "../decode/prefix.js";
import { pushStack } from "../memory/stack.js";
import { SegmentAccessError, type SegmentedMemory } from "../memory/segmented-memory.js";
import { DescriptorLookupError, readGdtDescriptor } from "../protection/descriptor.js";
import { InterruptGateLookupError, readInterruptGate } from "../protection/interrupt-gate.js";
import {
  loadCodeSegment,
  loadDataSegment,
  loadStackSegment
} from "../protection/segment-loader.js";
import type { RebuiltCpuState } from "../state/cpu-state.js";
import { PageFaultError } from "../../../memory/address-translation.js";
import { SegmentLoadError } from "../protection/segment-loader.js";

const EFLAGS_INTERRUPT = 0x00000200;
const EFLAGS_TRAP = 0x00000100;

export class InterruptDeliveryError extends Error {
  public constructor(
    message: string,
    readonly vector: 10 | 11 | 12 | 13,
    readonly errorCode: number
  ) {
    super(message);
  }
}

export class RebuiltTripleFaultError extends Error {
  public constructor() {
    super("Double-fault delivery failed");
  }
}

export interface InterruptRequest {
  readonly vector: number;
  readonly returnEip: number;
  readonly operandSize: OperandSize;
  readonly software: boolean;
  readonly errorCode?: number;
}

export function deliverInterrupt(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  request: InterruptRequest
): void {
  if (!(state.readCr0() & 1)) return deliverRealModeInterrupt(memory, state, request);
  let gate;
  try {
    gate = readInterruptGate(
      { readUint8: (address) => memory.readPhysical8(address), writeUint8: () => undefined },
      state.readIdtr(),
      request.vector
    );
  } catch (error) {
    if (error instanceof InterruptGateLookupError)
      throw new InterruptDeliveryError(error.message, 13, idtErrorCode(request.vector));
    throw error;
  }
  const currentPrivilege = privilege(state);
  if (!gate.present)
    throw new InterruptDeliveryError(
      "Protected-mode interrupt gate is not present",
      11,
      idtErrorCode(request.vector)
    );
  if (request.software && currentPrivilege > gate.dpl)
    throw new InterruptDeliveryError(
      "Software interrupt gate privilege violation",
      13,
      idtErrorCode(request.vector)
    );
  let descriptor;
  try {
    descriptor = readGdtDescriptor(
      { readUint8: (address) => memory.readPhysical8(address), writeUint8: () => undefined },
      state.readGdtr(),
      gate.selector
    );
  } catch (error) {
    if (error instanceof DescriptorLookupError)
      throw new InterruptDeliveryError("Interrupt gate target exceeds the GDT", 13, gate.selector);
    throw error;
  }
  if (!descriptor.system || !(descriptor.type & 8))
    throw new InterruptDeliveryError(
      "Interrupt gate target is not a code segment",
      13,
      gate.selector
    );
  if (!descriptor.present)
    throw new InterruptDeliveryError("Interrupt gate target is not present", 11, gate.selector);
  const conforming = Boolean(descriptor.type & 4);
  const targetPrivilege = conforming ? currentPrivilege : descriptor.dpl;
  if (targetPrivilege > currentPrivilege)
    throw new InterruptDeliveryError(
      "Interrupt gate cannot transfer to a less-privileged code segment",
      13,
      gate.selector
    );
  const virtual8086 = state.isVirtual8086();
  const outerFrame =
    targetPrivilege < currentPrivilege
      ? switchToPrivilegeStack(memory, state, targetPrivilege, virtual8086)
      : undefined;
  if (outerFrame?.virtual8086) {
    pushVirtual8086Frame(
      memory,
      state,
      gate.operandSize,
      request.returnEip,
      request.errorCode,
      outerFrame
    );
    loadDataSegment(memory, state, "gs", 0);
    loadDataSegment(memory, state, "fs", 0);
    loadDataSegment(memory, state, "ds", 0);
    loadDataSegment(memory, state, "es", 0);
  } else if (outerFrame !== undefined) {
    pushStack(memory, state, gate.operandSize, outerFrame.ss);
    pushStack(memory, state, gate.operandSize, outerFrame.esp);
  }
  if (!outerFrame?.virtual8086)
    pushInterruptFrame(memory, state, gate.operandSize, request.returnEip, request.errorCode);
  if (gate.trap) state.flags.clear(EFLAGS_TRAP);
  else state.flags.clear(EFLAGS_INTERRUPT | EFLAGS_TRAP);
  loadCodeSegment(memory, state, gate.selector, targetPrivilege);
  state.writeEip(gate.operandSize === 16 ? gate.offset & 0xffff : gate.offset);
}

function switchToPrivilegeStack(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  targetPrivilege: number,
  virtual8086: boolean
): {
  readonly esp: number;
  readonly ss: number;
  readonly virtual8086: boolean;
  readonly flags: number;
  readonly cs: number;
  readonly es: number;
  readonly ds: number;
  readonly fs: number;
  readonly gs: number;
} {
  const tr = state.readTr();
  const tss32 = tr.type === 9 || tr.type === 11;
  const tss16 = tr.type === 1 || tr.type === 3;
  const stackPointerOffset = (tss32 ? 4 : 2) + targetPrivilege * (tss32 ? 8 : 4);
  const stackSelectorOffset = (tss32 ? 8 : 4) + targetPrivilege * (tss32 ? 8 : 4);
  if ((tr.selector & 0xfff8) === 0 || (!tss16 && !tss32) || tr.limit < stackSelectorOffset + 1)
    throw new InterruptDeliveryError(
      "Interrupt privilege change requires a valid TSS",
      10,
      tr.selector
    );
  if (targetPrivilege < 0 || targetPrivilege > 2)
    throw new InterruptDeliveryError(
      "Interrupt privilege change requires a TSS stack for rings zero through two",
      10,
      tr.selector
    );
  const esp = tss32
    ? readPhysical32(memory, tr.base + stackPointerOffset)
    : memory.readPhysical8(tr.base + stackPointerOffset) |
      (memory.readPhysical8(tr.base + stackPointerOffset + 1) << 8);
  const ss =
    memory.readPhysical8(tr.base + stackSelectorOffset) |
    (memory.readPhysical8(tr.base + stackSelectorOffset + 1) << 8);
  const old = {
    esp:
      virtual8086 || state.stackDefault32() ? state.registers.read32(4) : state.registers.read16(4),
    ss: state.readSegment("ss").selector,
    virtual8086,
    flags: state.flags.read(),
    cs: state.readSegment("cs").selector,
    es: state.readSegment("es").selector,
    ds: state.readSegment("ds").selector,
    fs: state.readSegment("fs").selector,
    gs: state.readSegment("gs").selector
  };
  if (virtual8086) state.flags.clear(0x00034100);
  loadStackSegment(memory, state, ss, targetPrivilege);
  if (state.stackDefault32()) state.registers.write32(4, esp);
  else state.registers.write16(4, esp);
  return old;
}

function pushVirtual8086Frame(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  operandSize: OperandSize,
  returnEip: number,
  errorCode: number | undefined,
  frame: ReturnType<typeof switchToPrivilegeStack>
): void {
  pushStack(memory, state, operandSize, frame.gs);
  pushStack(memory, state, operandSize, frame.fs);
  pushStack(memory, state, operandSize, frame.ds);
  pushStack(memory, state, operandSize, frame.es);
  pushStack(memory, state, operandSize, frame.ss);
  pushStack(memory, state, operandSize, frame.esp);
  pushStack(memory, state, operandSize, frame.flags);
  pushStack(memory, state, operandSize, frame.cs);
  pushStack(memory, state, operandSize, returnEip);
  if (errorCode !== undefined) pushStack(memory, state, operandSize, errorCode);
}

export function deliverFault(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  vector: number,
  faultEip: number,
  errorCode?: number
): void {
  try {
    deliverInterrupt(memory, state, {
      vector,
      returnEip: faultEip,
      operandSize: 16,
      software: false,
      errorCode
    });
  } catch (error) {
    const deliveryFault = faultFromDeliveryError(error);
    if (!deliveryFault) throw error;
    if (vector === 8) throw new RebuiltTripleFaultError();
    if (requiresDoubleFault(vector, deliveryFault.vector))
      return deliverDoubleFault(memory, state, faultEip);
    deliverFault(memory, state, deliveryFault.vector, faultEip, deliveryFault.errorCode);
  }
}

function deliverDoubleFault(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  faultEip: number
): void {
  try {
    deliverInterrupt(memory, state, {
      vector: 8,
      returnEip: faultEip,
      operandSize: 16,
      software: false,
      errorCode: 0
    });
  } catch {
    throw new RebuiltTripleFaultError();
  }
}

function faultFromDeliveryError(
  error: unknown
): { readonly vector: number; readonly errorCode: number } | undefined {
  if (error instanceof InterruptDeliveryError)
    return { vector: error.vector, errorCode: error.errorCode };
  if (error instanceof InterruptGateLookupError) return { vector: 13, errorCode: 0 };
  if (error instanceof DescriptorLookupError) return { vector: 13, errorCode: 0 };
  if (error instanceof SegmentLoadError)
    return { vector: error.vector, errorCode: error.errorCode };
  if (error instanceof SegmentAccessError)
    return { vector: error.segment === "ss" ? 12 : 13, errorCode: 0 };
  if (error instanceof PageFaultError)
    return {
      vector: 14,
      errorCode:
        (error.present ? 1 : 0) | (error.access.write ? 2 : 0) | (error.access.user ? 4 : 0)
    };
  return undefined;
}

function requiresDoubleFault(firstVector: number, secondVector: number): boolean {
  const firstContributory = [10, 11, 12, 13].includes(firstVector);
  const secondContributory = [10, 11, 12, 13].includes(secondVector);
  const firstPageFault = firstVector === 14;
  const secondPageFault = secondVector === 14;
  return (
    (firstContributory && (secondContributory || secondPageFault)) ||
    (firstPageFault && (secondContributory || secondPageFault))
  );
}

function idtErrorCode(vector: number): number {
  return ((vector & 0xff) << 3) | 2;
}

function deliverRealModeInterrupt(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  request: InterruptRequest
): void {
  const vectorAddress = (state.readIdtr().base + ((request.vector & 0xff) << 2)) >>> 0;
  const offset =
    memory.readPhysical8(vectorAddress) | (memory.readPhysical8(vectorAddress + 1) << 8);
  const selector =
    memory.readPhysical8(vectorAddress + 2) | (memory.readPhysical8(vectorAddress + 3) << 8);
  pushInterruptFrame(memory, state, request.operandSize, request.returnEip);
  state.flags.clear(EFLAGS_INTERRUPT | EFLAGS_TRAP);
  loadCodeSegment(memory, state, selector);
  state.writeEip(offset);
}

function pushInterruptFrame(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  operandSize: OperandSize,
  returnEip: number,
  errorCode?: number
): void {
  pushStack(memory, state, operandSize, state.flags.read());
  pushStack(memory, state, operandSize, state.readSegment("cs").selector);
  pushStack(memory, state, operandSize, returnEip);
  if (errorCode !== undefined) pushStack(memory, state, operandSize, errorCode);
}

function privilege(state: RebuiltCpuState): number {
  if (!(state.readCr0() & 1)) return 0;
  if (state.isVirtual8086()) return 3;
  const code = state.readSegment("cs");
  return code.dpl ?? code.selector & 3;
}

function readPhysical32(memory: SegmentedMemory, address: number): number {
  return (
    (memory.readPhysical8(address) |
      (memory.readPhysical8(address + 1) << 8) |
      (memory.readPhysical8(address + 2) << 16) |
      (memory.readPhysical8(address + 3) << 24)) >>>
    0
  );
}
