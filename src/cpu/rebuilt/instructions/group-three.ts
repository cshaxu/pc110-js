import { decodeModRm, type DecodedModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";
import type { SegmentName } from "../state/segments.js";
import {
  logical,
  subtract,
  EFLAGS_CARRY,
  EFLAGS_OVERFLOW,
  type ArithmeticWidth
} from "./arithmetic.js";

export class RebuiltDivideError extends Error {
  public constructor(readonly faultEip: number) {
    super("Rebuilt divide error");
  }
}

export function executeGroupThree(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode !== 0xf6 && opcode !== 0xf7)
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt Group Three coverage`);
  const width: ArithmeticWidth = opcode === 0xf6 ? 8 : context.instruction.prefixes.operandSize;
  const offset = context.instruction.opcodeOffset + 1;
  const modRm = decodeModRm(
    context.reader,
    offset,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  const operand = readRm(context, modRm, width);
  if (modRm.reg === 0) {
    const immediateBytes = width / 8;
    const immediate = readImmediate(context, offset + modRm.bytes, immediateBytes);
    context.state.flags.write(
      logical(context.state.flags.read(), operand & immediate, width).flags
    );
    context.state.advanceEip(context.instruction.length + modRm.bytes + immediateBytes);
    return;
  }
  if (modRm.reg === 1) throw new Error("F6/F7 /1 requires rebuilt #UD delivery");
  if (modRm.reg === 2) writeRm(context, modRm, width, ~operand);
  else if (modRm.reg === 3) {
    const result = subtract(context.state.flags.read(), 0, operand, width);
    context.state.flags.write(result.flags);
    writeRm(context, modRm, width, result.value);
  } else if (modRm.reg === 4) multiply(context, operand, width, false);
  else if (modRm.reg === 5) multiply(context, operand, width, true);
  else if (modRm.reg === 6) divide(context, operand, width, false);
  else divide(context, operand, width, true);
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

function multiply(
  context: RebuiltExecutionContext,
  operand: number,
  width: ArithmeticWidth,
  signed: boolean
): void {
  const left = signed
    ? toSigned(readAccumulator(context, width), width)
    : BigInt(readAccumulator(context, width));
  const right = signed ? toSigned(operand, width) : BigInt(normalize(operand, width));
  const product = left * right;
  const low = BigInt.asUintN(width, product);
  const high = BigInt.asUintN(width, product >> BigInt(width));
  writeAccumulator(context, width, Number(low));
  writeHighAccumulator(context, width, Number(high));
  const overflow = signed ? product !== toSigned(Number(low), width) : high !== 0n;
  const flags = context.state.flags.read() & ~(EFLAGS_CARRY | EFLAGS_OVERFLOW);
  context.state.flags.write(overflow ? flags | EFLAGS_CARRY | EFLAGS_OVERFLOW : flags);
}

function divide(
  context: RebuiltExecutionContext,
  operand: number,
  width: ArithmeticWidth,
  signed: boolean
): void {
  const divisor = signed ? toSigned(operand, width) : BigInt(normalize(operand, width));
  if (divisor === 0n) throw new RebuiltDivideError(context.state.readEip());
  const dividend = signed ? signedDividend(context, width) : unsignedDividend(context, width);
  const quotient = dividend / divisor;
  const remainder = dividend % divisor;
  const min = signed ? -(1n << BigInt(width - 1)) : 0n;
  const max = signed ? (1n << BigInt(width - 1)) - 1n : (1n << BigInt(width)) - 1n;
  if (quotient < min || quotient > max) throw new RebuiltDivideError(context.state.readEip());
  writeAccumulator(context, width, Number(BigInt.asUintN(width, quotient)));
  writeHighAccumulator(context, width, Number(BigInt.asUintN(width, remainder)));
}

function unsignedDividend(context: RebuiltExecutionContext, width: ArithmeticWidth): bigint {
  if (width === 8) return BigInt(context.state.registers.read16(0));
  const low = BigInt(readAccumulator(context, width));
  const high = BigInt(readHighAccumulator(context, width));
  return (high << BigInt(width)) | low;
}

function signedDividend(context: RebuiltExecutionContext, width: ArithmeticWidth): bigint {
  if (width === 8) return BigInt.asIntN(16, BigInt(context.state.registers.read16(0)));
  const low = BigInt(readAccumulator(context, width));
  const high = BigInt(readHighAccumulator(context, width));
  return BigInt.asIntN(width * 2, (high << BigInt(width)) | low);
}

function readAccumulator(context: RebuiltExecutionContext, width: ArithmeticWidth): number {
  return width === 8
    ? context.state.registers.read8(0)
    : width === 16
      ? context.state.registers.read16(0)
      : context.state.registers.read32(0);
}

function writeAccumulator(
  context: RebuiltExecutionContext,
  width: ArithmeticWidth,
  value: number
): void {
  if (width === 8) context.state.registers.write8(0, value);
  else if (width === 16) context.state.registers.write16(0, value);
  else context.state.registers.write32(0, value);
}

function readHighAccumulator(context: RebuiltExecutionContext, width: ArithmeticWidth): number {
  return width === 8
    ? context.state.registers.read8(4)
    : width === 16
      ? context.state.registers.read16(2)
      : context.state.registers.read32(2);
}

function writeHighAccumulator(
  context: RebuiltExecutionContext,
  width: ArithmeticWidth,
  value: number
): void {
  if (width === 8) context.state.registers.write8(4, value);
  else if (width === 16) context.state.registers.write16(2, value);
  else context.state.registers.write32(2, value);
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
  index: number,
  width: ArithmeticWidth
): number {
  return width === 8
    ? context.state.registers.read8(index)
    : width === 16
      ? context.state.registers.read16(index)
      : context.state.registers.read32(index);
}

function writeRegister(
  context: RebuiltExecutionContext,
  index: number,
  width: ArithmeticWidth,
  value: number
): void {
  if (width === 8) context.state.registers.write8(index, value);
  else if (width === 16) context.state.registers.write16(index, value);
  else context.state.registers.write32(index, value);
}

function readImmediate(context: RebuiltExecutionContext, offset: number, bytes: number): number {
  let value = 0;
  for (let index = 0; index < bytes; index += 1)
    value |= (context.reader.readCodeByte(offset + index) & 0xff) << (index * 8);
  return bytes === 4 ? value >>> 0 : value;
}

function toSigned(value: number, width: ArithmeticWidth): bigint {
  return BigInt.asIntN(width, BigInt(normalize(value, width)));
}

function normalize(value: number, width: ArithmeticWidth): number {
  return width === 8 ? value & 0xff : width === 16 ? value & 0xffff : value >>> 0;
}
