import type { RebuiltExecutionContext } from "../execution.js";
import { logical, type ArithmeticWidth } from "./arithmetic.js";

export function executeAccumulatorTest(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode !== 0xa8 && opcode !== 0xa9)
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt accumulator TEST coverage`);
  const width: ArithmeticWidth = opcode === 0xa8 ? 8 : context.instruction.prefixes.operandSize;
  const bytes = width / 8;
  const immediate = readImmediate(context, context.instruction.opcodeOffset + 1, bytes);
  const accumulator =
    width === 8
      ? context.state.registers.read8(0)
      : width === 16
        ? context.state.registers.read16(0)
        : context.state.registers.read32(0);
  context.state.flags.write(
    logical(context.state.flags.read(), accumulator & immediate, width).flags
  );
  context.state.advanceEip(context.instruction.length + bytes);
}

function readImmediate(context: RebuiltExecutionContext, offset: number, bytes: number): number {
  let value = 0;
  for (let index = 0; index < bytes; index += 1)
    value |= (context.reader.readCodeByte(offset + index) & 0xff) << (index * 8);
  return bytes === 4 ? value >>> 0 : value;
}
