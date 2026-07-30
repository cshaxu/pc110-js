import type { RebuiltExecutionContext } from "../execution.js";
import {
  EFLAGS_CARRY,
  EFLAGS_OVERFLOW,
  EFLAGS_PARITY,
  EFLAGS_SIGN,
  EFLAGS_ZERO
} from "./arithmetic.js";

export function executeShortConditionalJump(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode < 0x70 || opcode > 0x7f) {
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt 70-7F coverage`);
  }
  const displacementOffset = context.instruction.opcodeOffset + 1;
  const displacement = (context.reader.readCodeByte(displacementOffset) << 24) >> 24;
  const fallthrough = context.state.readEip() + context.instruction.length + 1;
  const destination = condition(context.state.flags.read(), opcode & 0x0f)
    ? fallthrough + displacement
    : fallthrough;
  const code32 = context.state.codeDefault32();
  context.state.writeEip(code32 ? destination >>> 0 : destination & 0xffff);
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
