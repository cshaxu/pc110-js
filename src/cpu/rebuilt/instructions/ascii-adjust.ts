import type { RebuiltExecutionContext } from "../execution.js";
import { EFLAGS_PARITY, EFLAGS_SIGN, EFLAGS_ZERO } from "./arithmetic.js";

const DEFINED_MASK = EFLAGS_PARITY | EFLAGS_SIGN | EFLAGS_ZERO;

export function executeAsciiAdjust(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode !== 0xd4 && opcode !== 0xd5)
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt AAM/AAD coverage`);
  const base = context.reader.readCodeByte(context.instruction.opcodeOffset + 1) & 0xff;
  if (opcode === 0xd4) {
    if (base === 0) throw new Error("AAM base zero requires rebuilt #DE delivery");
    const al = context.state.registers.read8(0);
    context.state.registers.write8(4, Math.floor(al / base));
    context.state.registers.write8(0, al % base);
  } else {
    const value =
      (context.state.registers.read8(0) + context.state.registers.read8(4) * base) & 0xff;
    context.state.registers.write8(0, value);
    context.state.registers.write8(4, 0);
  }
  const value = context.state.registers.read8(0);
  let flags = context.state.flags.read() & ~DEFINED_MASK;
  if (value === 0) flags |= EFLAGS_ZERO;
  if (value & 0x80) flags |= EFLAGS_SIGN;
  if (evenParity(value)) flags |= EFLAGS_PARITY;
  context.state.flags.write(flags);
  context.state.advanceEip(context.instruction.length + 1);
}

function evenParity(value: number): boolean {
  let parity = true;
  let bits = value;
  while (bits) {
    parity = !parity;
    bits &= bits - 1;
  }
  return parity;
}
