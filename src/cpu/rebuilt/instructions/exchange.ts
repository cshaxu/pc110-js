import { decodeModRm, type DecodedModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";
import type { SegmentName } from "../state/segments.js";
import type { ArithmeticWidth } from "./arithmetic.js";

export function executeExchangeModRm(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode !== 0x86 && opcode !== 0x87)
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt XCHG coverage`);
  const width: ArithmeticWidth = opcode === 0x86 ? 8 : context.instruction.prefixes.operandSize;
  const offset = context.instruction.opcodeOffset + 1;
  const modRm = decodeModRm(
    context.reader,
    offset,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  const left = readRm(context, modRm, width);
  const right = readRegister(context, modRm.reg, width);
  writeRegister(context, modRm.reg, width, left);
  writeRm(context, modRm, width, right);
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

function readRm(
  context: RebuiltExecutionContext,
  modRm: DecodedModRm,
  width: ArithmeticWidth
): number {
  if (modRm.registerDirect) return readRegister(context, modRm.rm, width);
  const memory = modRm.memory!;
  const segment: SegmentName = context.instruction.prefixes.segmentOverride ?? memory.segment;
  return width === 8
    ? context.memory.read8(segment, memory.offset, context.instruction.prefixes.addressSize)
    : width === 16
      ? context.memory.read16(segment, memory.offset, context.instruction.prefixes.addressSize)
      : context.memory.read32(segment, memory.offset, context.instruction.prefixes.addressSize);
}

function writeRm(
  context: RebuiltExecutionContext,
  modRm: DecodedModRm,
  width: ArithmeticWidth,
  value: number
): void {
  if (modRm.registerDirect) return writeRegister(context, modRm.rm, width, value);
  const memory = modRm.memory!;
  const segment: SegmentName = context.instruction.prefixes.segmentOverride ?? memory.segment;
  if (width === 8)
    context.memory.write8(segment, memory.offset, value, context.instruction.prefixes.addressSize);
  else if (width === 16)
    context.memory.write16(segment, memory.offset, value, context.instruction.prefixes.addressSize);
  else
    context.memory.write32(segment, memory.offset, value, context.instruction.prefixes.addressSize);
}

function readRegister(
  context: RebuiltExecutionContext,
  register: number,
  width: ArithmeticWidth
): number {
  return width === 8
    ? context.state.registers.read8(register)
    : width === 16
      ? context.state.registers.read16(register)
      : context.state.registers.read32(register);
}

function writeRegister(
  context: RebuiltExecutionContext,
  register: number,
  width: ArithmeticWidth,
  value: number
): void {
  if (width === 8) context.state.registers.write8(register, value);
  else if (width === 16) context.state.registers.write16(register, value);
  else context.state.registers.write32(register, value);
}
