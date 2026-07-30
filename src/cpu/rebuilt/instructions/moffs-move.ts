import type { RebuiltExecutionContext } from "../execution.js";
import type { SegmentName } from "../state/segments.js";

export function executeMoffsMove(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode < 0xa0 || opcode > 0xa3)
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt moffs MOV coverage`);
  const width = opcode === 0xa0 || opcode === 0xa2 ? 8 : context.instruction.prefixes.operandSize;
  const addressBytes = context.instruction.prefixes.addressSize / 8;
  const offset = readImmediate(context, context.instruction.opcodeOffset + 1, addressBytes);
  const segment: SegmentName = context.instruction.prefixes.segmentOverride ?? "ds";
  const load = opcode === 0xa0 || opcode === 0xa1;
  if (load) {
    const value =
      width === 8
        ? context.memory.read8(segment, offset, context.instruction.prefixes.addressSize)
        : width === 16
          ? context.memory.read16(segment, offset, context.instruction.prefixes.addressSize)
          : context.memory.read32(segment, offset, context.instruction.prefixes.addressSize);
    if (width === 8) context.state.registers.write8(0, value);
    else if (width === 16) context.state.registers.write16(0, value);
    else context.state.registers.write32(0, value);
  } else {
    const value =
      width === 8
        ? context.state.registers.read8(0)
        : width === 16
          ? context.state.registers.read16(0)
          : context.state.registers.read32(0);
    if (width === 8)
      context.memory.write8(segment, offset, value, context.instruction.prefixes.addressSize);
    else if (width === 16)
      context.memory.write16(segment, offset, value, context.instruction.prefixes.addressSize);
    else context.memory.write32(segment, offset, value, context.instruction.prefixes.addressSize);
  }
  context.state.advanceEip(context.instruction.length + addressBytes);
}

function readImmediate(context: RebuiltExecutionContext, offset: number, bytes: number): number {
  let value = 0;
  for (let index = 0; index < bytes; index += 1)
    value |= (context.reader.readCodeByte(offset + index) & 0xff) << (index * 8);
  return bytes === 4 ? value >>> 0 : value;
}
