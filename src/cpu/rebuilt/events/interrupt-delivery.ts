import type { OperandSize } from "../decode/prefix.js";
import { pushStack } from "../memory/stack.js";
import type { SegmentedMemory } from "../memory/segmented-memory.js";
import { readGdtDescriptor } from "../protection/descriptor.js";
import { readInterruptGate } from "../protection/interrupt-gate.js";
import { loadCodeSegment, loadStackSegment } from "../protection/segment-loader.js";
import type { RebuiltCpuState } from "../state/cpu-state.js";

const EFLAGS_INTERRUPT = 0x00000200;
const EFLAGS_TRAP = 0x00000100;

export class InterruptDeliveryError extends Error {}

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
  const gate = readInterruptGate(
    { readUint8: (address) => memory.readPhysical8(address), writeUint8: () => undefined },
    state.readIdtr(),
    request.vector
  );
  const currentPrivilege = privilege(state);
  if (!gate.present)
    throw new InterruptDeliveryError("Protected-mode interrupt gate is not present");
  if (request.software && currentPrivilege > gate.dpl)
    throw new InterruptDeliveryError("Software interrupt gate privilege violation");
  const descriptor = readGdtDescriptor(
    { readUint8: (address) => memory.readPhysical8(address), writeUint8: () => undefined },
    state.readGdtr(),
    gate.selector
  );
  if (!descriptor.system || !(descriptor.type & 8) || !descriptor.present)
    throw new InterruptDeliveryError("Interrupt gate target is not a present code segment");
  const conforming = Boolean(descriptor.type & 4);
  const targetPrivilege = conforming ? currentPrivilege : descriptor.dpl;
  if (targetPrivilege > currentPrivilege)
    throw new InterruptDeliveryError(
      "Interrupt gate cannot transfer to a less-privileged code segment"
    );
  const outerFrame =
    targetPrivilege < currentPrivilege
      ? switchToPrivilegeStack(memory, state, targetPrivilege)
      : undefined;
  if (outerFrame !== undefined) {
    pushStack(memory, state, gate.operandSize, outerFrame.ss);
    pushStack(memory, state, gate.operandSize, outerFrame.esp);
  }
  pushInterruptFrame(memory, state, gate.operandSize, request.returnEip, request.errorCode);
  if (gate.trap) state.flags.clear(EFLAGS_TRAP);
  else state.flags.clear(EFLAGS_INTERRUPT | EFLAGS_TRAP);
  loadCodeSegment(memory, state, gate.selector, targetPrivilege);
  state.writeEip(gate.operandSize === 16 ? gate.offset & 0xffff : gate.offset);
}

function switchToPrivilegeStack(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  targetPrivilege: number
): { readonly esp: number; readonly ss: number } {
  if (state.isVirtual8086())
    throw new InterruptDeliveryError("Virtual-8086 interrupt frames require rebuilt v86 delivery");
  const tr = state.readTr();
  if ((tr.selector & 0xfff8) === 0 || tr.type !== 9 || tr.limit < 9)
    throw new InterruptDeliveryError("Interrupt privilege change requires a valid 32-bit TSS");
  if (targetPrivilege !== 0)
    throw new InterruptDeliveryError("Only the 32-bit TSS ring-zero stack is rebuilt");
  const esp = readPhysical32(memory, tr.base + 4);
  const ss = memory.readPhysical8(tr.base + 8) | (memory.readPhysical8(tr.base + 9) << 8);
  const old = {
    esp: state.stackDefault32() ? state.registers.read32(4) : state.registers.read16(4),
    ss: state.readSegment("ss").selector
  };
  loadStackSegment(memory, state, ss, targetPrivilege);
  if (state.stackDefault32()) state.registers.write32(4, esp);
  else state.registers.write16(4, esp);
  return old;
}

export function deliverFault(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  vector: number,
  faultEip: number,
  errorCode?: number
): void {
  deliverInterrupt(memory, state, {
    vector,
    returnEip: faultEip,
    operandSize: 16,
    software: false,
    errorCode
  });
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
