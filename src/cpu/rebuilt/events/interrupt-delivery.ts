import type { OperandSize } from "../decode/prefix.js";
import { pushStack } from "../memory/stack.js";
import type { SegmentedMemory } from "../memory/segmented-memory.js";
import { readGdtDescriptor } from "../protection/descriptor.js";
import { readInterruptGate } from "../protection/interrupt-gate.js";
import { loadCodeSegment } from "../protection/segment-loader.js";
import type { RebuiltCpuState } from "../state/cpu-state.js";

const EFLAGS_INTERRUPT = 0x00000200;
const EFLAGS_TRAP = 0x00000100;

export class InterruptDeliveryError extends Error {}

export interface InterruptRequest {
  readonly vector: number;
  readonly returnEip: number;
  readonly operandSize: OperandSize;
  readonly software: boolean;
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
  const currentPrivilege = state.readSegment("cs").selector & 3;
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
  if (targetPrivilege !== currentPrivilege)
    throw new InterruptDeliveryError(
      "Privilege-changing interrupt delivery requires rebuilt TSS support"
    );
  pushInterruptFrame(memory, state, gate.operandSize, request.returnEip);
  if (gate.trap) state.flags.clear(EFLAGS_TRAP);
  else state.flags.clear(EFLAGS_INTERRUPT | EFLAGS_TRAP);
  loadCodeSegment(memory, state, gate.selector);
  state.writeEip(gate.operandSize === 16 ? gate.offset & 0xffff : gate.offset);
}

export function deliverFault(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  vector: number,
  faultEip: number
): void {
  deliverInterrupt(memory, state, {
    vector,
    returnEip: faultEip,
    operandSize: 16,
    software: false
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
  returnEip: number
): void {
  pushStack(memory, state, operandSize, state.flags.read());
  pushStack(memory, state, operandSize, state.readSegment("cs").selector);
  pushStack(memory, state, operandSize, returnEip);
}
