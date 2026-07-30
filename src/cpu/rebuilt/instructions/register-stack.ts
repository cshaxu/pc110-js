import type { RebuiltExecutionContext } from "../execution.js";
import { popStack, pushStack } from "../memory/stack.js";
import { add, subtract, EFLAGS_CARRY, type ArithmeticWidth } from "./arithmetic.js";

const FIRST_REGISTER_OPCODE = 0x40;
const LAST_REGISTER_OPCODE = 0x5f;

export function executeRegisterStackInterval(context: RebuiltExecutionContext): void {
  const { opcode, prefixes, length } = context.instruction;
  if (opcode < FIRST_REGISTER_OPCODE || opcode > LAST_REGISTER_OPCODE) {
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt 40-5F coverage`);
  }

  const register = opcode & 0x07;
  const width = prefixes.operandSize;
  if (opcode < 0x48) executeIncrement(context, register, width);
  else if (opcode < 0x50) executeDecrement(context, register, width);
  else if (opcode < 0x58)
    pushStack(context.memory, context.state, width, readRegister(context, register, width));
  else writeRegister(context, register, width, popStack(context.memory, context.state, width));
  context.state.advanceEip(length);
}

function executeIncrement(
  context: RebuiltExecutionContext,
  register: number,
  width: ArithmeticWidth
): void {
  const flags = context.state.flags.read();
  const result = add(flags, readRegister(context, register, width), 1, width);
  context.state.flags.write(preserveCarry(result.flags, flags));
  writeRegister(context, register, width, result.value);
}

function executeDecrement(
  context: RebuiltExecutionContext,
  register: number,
  width: ArithmeticWidth
): void {
  const flags = context.state.flags.read();
  const result = subtract(flags, readRegister(context, register, width), 1, width);
  context.state.flags.write(preserveCarry(result.flags, flags));
  writeRegister(context, register, width, result.value);
}

function preserveCarry(nextFlags: number, priorFlags: number): number {
  return ((nextFlags & ~EFLAGS_CARRY) | (priorFlags & EFLAGS_CARRY)) >>> 0;
}

function readRegister(
  context: RebuiltExecutionContext,
  index: number,
  width: ArithmeticWidth
): number {
  return width === 16
    ? context.state.registers.read16(index)
    : context.state.registers.read32(index);
}

function writeRegister(
  context: RebuiltExecutionContext,
  index: number,
  width: ArithmeticWidth,
  value: number
): void {
  if (width === 16) context.state.registers.write16(index, value);
  else context.state.registers.write32(index, value);
}
