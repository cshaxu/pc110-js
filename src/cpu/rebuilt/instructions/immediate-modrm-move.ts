import { decodeModRm, type DecodedModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";
import type { SegmentName } from "../state/segments.js";

export function executeImmediateModRmMove(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode !== 0xc6 && opcode !== 0xc7)
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt C6/C7 coverage`);
  const width = opcode === 0xc6 ? 8 : context.instruction.prefixes.operandSize;
  const offset = context.instruction.opcodeOffset + 1;
  const modRm = decodeModRm(
    context.reader,
    offset,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  if (modRm.reg !== 0) throw new Error("C6/C7 non-zero extensions require rebuilt #UD delivery");
  const immediateBytes = width / 8;
  const value = readImmediate(context, offset + modRm.bytes, immediateBytes);
  writeRm(context, modRm, width, value);
  context.state.advanceEip(context.instruction.length + modRm.bytes + immediateBytes);
}

function writeRm(
  context: RebuiltExecutionContext,
  modRm: DecodedModRm,
  width: number,
  value: number
): void {
  if (modRm.registerDirect) {
    if (width === 8) context.state.registers.write8(modRm.rm, value);
    else if (width === 16) context.state.registers.write16(modRm.rm, value);
    else context.state.registers.write32(modRm.rm, value);
    return;
  }
  const memory = modRm.memory!;
  const segment: SegmentName = context.instruction.prefixes.segmentOverride ?? memory.segment;
  if (width === 8)
    context.memory.write8(segment, memory.offset, value, context.instruction.prefixes.addressSize);
  else if (width === 16)
    context.memory.write16(segment, memory.offset, value, context.instruction.prefixes.addressSize);
  else
    context.memory.write32(segment, memory.offset, value, context.instruction.prefixes.addressSize);
}

function readImmediate(context: RebuiltExecutionContext, offset: number, bytes: number): number {
  let value = 0;
  for (let index = 0; index < bytes; index += 1)
    value |= (context.reader.readCodeByte(offset + index) & 0xff) << (index * 8);
  return bytes === 4 ? value >>> 0 : value;
}
