import { decodeModRm, type DecodedModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";
import type { SegmentName } from "../state/segments.js";
import {
  EFLAGS_CARRY,
  EFLAGS_OVERFLOW,
  EFLAGS_PARITY,
  EFLAGS_SIGN,
  EFLAGS_ZERO
} from "./arithmetic.js";

export function executeSetCondition(context: RebuiltExecutionContext): void {
  if (context.instruction.opcode !== 0x0f) throw new Error("SETcc requires the 0F opcode escape");
  const opcode = context.instruction.secondaryOpcode;
  if (opcode === undefined || opcode < 0x90 || opcode > 0x9f)
    throw new Error("Opcode is outside rebuilt SETcc coverage");
  const offset = context.instruction.opcodeOffset + 2;
  const modRm = decodeModRm(
    context.reader,
    offset,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  writeRm8(context, modRm, condition(context.state.flags.read(), opcode & 0x0f) ? 1 : 0);
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

function writeRm8(context: RebuiltExecutionContext, modRm: DecodedModRm, value: number): void {
  if (modRm.registerDirect) {
    context.state.registers.write8(modRm.rm, value);
    return;
  }
  const memory = modRm.memory!;
  const segment: SegmentName = context.instruction.prefixes.segmentOverride ?? memory.segment;
  context.memory.write8(segment, memory.offset, value, context.instruction.prefixes.addressSize);
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
