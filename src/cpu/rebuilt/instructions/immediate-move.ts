import type { RebuiltExecutionContext } from "../execution.js";

export function executeImmediateMove(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode < 0xb0 || opcode > 0xbf)
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt immediate MOV coverage`);
  const register = opcode & 0x07;
  const byteForm = opcode < 0xb8;
  const bytes = byteForm ? 1 : context.instruction.prefixes.operandSize / 8;
  const value = readImmediate(context, context.instruction.opcodeOffset + 1, bytes);
  if (byteForm) context.state.registers.write8(register, value);
  else if (bytes === 2) context.state.registers.write16(register, value);
  else context.state.registers.write32(register, value);
  context.state.advanceEip(context.instruction.length + bytes);
}

function readImmediate(context: RebuiltExecutionContext, offset: number, bytes: number): number {
  let value = 0;
  for (let index = 0; index < bytes; index += 1)
    value |= (context.reader.readCodeByte(offset + index) & 0xff) << (index * 8);
  return bytes === 4 ? value >>> 0 : value;
}
