import type { OperandSize } from "../decode/prefix.js";
import type { RebuiltCpuState } from "../state/cpu-state.js";
import type { SegmentedMemory } from "./segmented-memory.js";

export function pushStack(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  operandSize: OperandSize,
  value: number
): void {
  const width = operandSize / 8;
  const stackAddressSize = state.stackDefault32() ? 32 : 16;
  const stackPointer =
    stackAddressSize === 32
      ? (state.registers.read32(4) - width) >>> 0
      : (state.registers.read16(4) - width) & 0xffff;
  if (stackAddressSize === 32) state.registers.write32(4, stackPointer);
  else state.registers.write16(4, stackPointer);
  if (operandSize === 32) memory.write32("ss", stackPointer, value, stackAddressSize);
  else memory.write16("ss", stackPointer, value, stackAddressSize);
}

export function popStack(
  memory: SegmentedMemory,
  state: RebuiltCpuState,
  operandSize: OperandSize
): number {
  const width = operandSize / 8;
  const stackAddressSize = state.stackDefault32() ? 32 : 16;
  const stackPointer =
    stackAddressSize === 32 ? state.registers.read32(4) : state.registers.read16(4);
  const value =
    operandSize === 32
      ? memory.read32("ss", stackPointer, stackAddressSize)
      : memory.read16("ss", stackPointer, stackAddressSize);
  if (stackAddressSize === 32) state.registers.write32(4, (stackPointer + width) >>> 0);
  else state.registers.write16(4, (stackPointer + width) & 0xffff);
  return value;
}
