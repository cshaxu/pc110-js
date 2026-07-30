import type { RebuiltExecutionContext } from "../execution.js";
import {
  EFLAGS_CARRY,
  EFLAGS_OVERFLOW,
  EFLAGS_PARITY,
  EFLAGS_SIGN,
  EFLAGS_ZERO
} from "./arithmetic.js";

export function executeNearConditionalJump(context: RebuiltExecutionContext): void {
  if (context.instruction.opcode !== 0x0f)
    throw new Error("Near Jcc requires the 0F opcode escape");
  const opcode = context.instruction.secondaryOpcode;
  if (opcode === undefined) throw new Error("Near Jcc requires a secondary opcode");
  if (opcode < 0x80 || opcode > 0x8f)
    throw new Error(`Opcode 0F 0x${opcode.toString(16)} is outside rebuilt near Jcc coverage`);
  const bytes = context.instruction.prefixes.operandSize / 8;
  const offset = context.instruction.opcodeOffset + 2;
  const displacement = signedImmediate(context, offset, bytes);
  const fallthrough = context.state.readEip() + context.instruction.length + bytes;
  if (condition(context.state.flags.read(), opcode & 0x0f)) {
    const destination = fallthrough + displacement;
    const target =
      context.instruction.prefixes.operandSize === 16 ? destination & 0xffff : destination >>> 0;
    context.memory.testCodeOffset(target);
    context.state.writeEip(target);
    return;
  }
  context.state.writeEip(context.state.codeDefault32() ? fallthrough >>> 0 : fallthrough & 0xffff);
}

function signedImmediate(context: RebuiltExecutionContext, offset: number, bytes: number): number {
  let value = 0;
  for (let index = 0; index < bytes; index += 1)
    value |= (context.reader.readCodeByte(offset + index) & 0xff) << (index * 8);
  return bytes === 2 ? (value << 16) >> 16 : value;
}

function condition(flags: number, selector: number): boolean {
  const carry = Boolean(flags & EFLAGS_CARRY);
  const zero = Boolean(flags & EFLAGS_ZERO);
  const sign = Boolean(flags & EFLAGS_SIGN);
  const overflow = Boolean(flags & EFLAGS_OVERFLOW);
  const parity = Boolean(flags & EFLAGS_PARITY);
  return [
    overflow,
    !overflow,
    carry,
    !carry,
    zero,
    !zero,
    carry || zero,
    !carry && !zero,
    sign,
    !sign,
    parity,
    !parity,
    sign !== overflow,
    sign === overflow,
    zero || sign !== overflow,
    !zero && sign === overflow
  ][selector]!;
}
