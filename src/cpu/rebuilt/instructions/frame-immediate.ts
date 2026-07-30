import { decodeModRm, type DecodedModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";
import { deliverFault } from "../events/interrupt-delivery.js";
import { popStack, pushStack } from "../memory/stack.js";
import type { SegmentName } from "../state/segments.js";
import { EFLAGS_CARRY, EFLAGS_OVERFLOW, type ArithmeticWidth } from "./arithmetic.js";

export function executeFrameImmediateSlice(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  let extraBytes = 0;
  if (opcode === 0x60) executePushAll(context);
  else if (opcode === 0x61) executePopAll(context);
  else if (opcode === 0x62) return executeBound(context);
  else if (opcode === 0x68 || opcode === 0x6a) extraBytes = executePushImmediate(context);
  else if (opcode === 0x69 || opcode === 0x6b) extraBytes = executeImmediateMultiply(context);
  else throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt 60-6B coverage`);
  context.state.advanceEip(context.instruction.length + extraBytes);
}

function executeBound(context: RebuiltExecutionContext): void {
  const width = context.instruction.prefixes.operandSize;
  const modRmOffset = context.instruction.opcodeOffset + 1;
  const modRm = decodeModRm(
    context.reader,
    modRmOffset,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  if (modRm.registerDirect)
    return deliverFault(context.memory, context.state, 6, context.state.readEip());
  const memory = modRm.memory!;
  const segment: SegmentName = context.instruction.prefixes.segmentOverride ?? memory.segment;
  const bytes = width / 8;
  const lower =
    width === 16
      ? context.memory.read16(segment, memory.offset, context.instruction.prefixes.addressSize)
      : context.memory.read32(segment, memory.offset, context.instruction.prefixes.addressSize);
  const upper =
    width === 16
      ? context.memory.read16(
          segment,
          memory.offset + bytes,
          context.instruction.prefixes.addressSize
        )
      : context.memory.read32(
          segment,
          memory.offset + bytes,
          context.instruction.prefixes.addressSize
        );
  const index = readRegister(context, modRm.reg, width);
  if (signed(index, width) < signed(lower, width) || signed(index, width) > signed(upper, width))
    return deliverFault(context.memory, context.state, 5, context.state.readEip());
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

function executePushAll(context: RebuiltExecutionContext): void {
  const width = context.instruction.prefixes.operandSize;
  const originalStackPointer = readRegister(context, 4, width);
  for (const register of [0, 1, 2, 3, -1, 5, 6, 7]) {
    const value = register === -1 ? originalStackPointer : readRegister(context, register, width);
    pushStack(context.memory, context.state, width, value);
  }
}

function executePopAll(context: RebuiltExecutionContext): void {
  const width = context.instruction.prefixes.operandSize;
  for (const register of [7, 6, 5, -1, 3, 2, 1, 0]) {
    const value = popStack(context.memory, context.state, width);
    if (register >= 0) writeRegister(context, register, width, value);
  }
}

function executePushImmediate(context: RebuiltExecutionContext): number {
  const width = context.instruction.prefixes.operandSize;
  const immediateBytes = context.instruction.opcode === 0x68 ? width / 8 : 1;
  const immediate = readImmediate(context, context.instruction.opcodeOffset + 1, immediateBytes);
  const value = context.instruction.opcode === 0x6a ? signExtend(immediate, 8, width) : immediate;
  pushStack(context.memory, context.state, width, value);
  return immediateBytes;
}

function executeImmediateMultiply(context: RebuiltExecutionContext): number {
  const width = context.instruction.prefixes.operandSize;
  const modRmOffset = context.instruction.opcodeOffset + 1;
  const modRm = decodeModRm(
    context.reader,
    modRmOffset,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  const immediateBytes = context.instruction.opcode === 0x69 ? width / 8 : 1;
  const immediate = readImmediate(context, modRmOffset + modRm.bytes, immediateBytes);
  const source = readRm(context, modRm, width);
  const product = signed(source, width) * signed(immediate, immediateBytes * 8);
  const mask = (1n << BigInt(width)) - 1n;
  const result = Number(product & mask);
  const overflow = product !== signed(result, width);
  const flags = context.state.flags.read() & ~(EFLAGS_CARRY | EFLAGS_OVERFLOW);
  context.state.flags.write(overflow ? flags | EFLAGS_CARRY | EFLAGS_OVERFLOW : flags);
  writeRegister(context, modRm.reg, width, result);
  return modRm.bytes + immediateBytes;
}

function readRm(
  context: RebuiltExecutionContext,
  modRm: DecodedModRm,
  width: ArithmeticWidth
): number {
  if (modRm.registerDirect) return readRegister(context, modRm.rm, width);
  const memory = modRm.memory!;
  const segment: SegmentName = context.instruction.prefixes.segmentOverride ?? memory.segment;
  return width === 16
    ? context.memory.read16(segment, memory.offset, context.instruction.prefixes.addressSize)
    : context.memory.read32(segment, memory.offset, context.instruction.prefixes.addressSize);
}

function readRegister(
  context: RebuiltExecutionContext,
  register: number,
  width: ArithmeticWidth
): number {
  return width === 16
    ? context.state.registers.read16(register)
    : context.state.registers.read32(register);
}

function writeRegister(
  context: RebuiltExecutionContext,
  register: number,
  width: ArithmeticWidth,
  value: number
): void {
  if (width === 16) context.state.registers.write16(register, value);
  else context.state.registers.write32(register, value);
}

function readImmediate(context: RebuiltExecutionContext, offset: number, bytes: number): number {
  let value = 0;
  for (let index = 0; index < bytes; index += 1)
    value |= (context.reader.readCodeByte(offset + index) & 0xff) << (index * 8);
  return bytes === 4 ? value >>> 0 : value;
}

function signExtend(value: number, sourceWidth: number, targetWidth: ArithmeticWidth): number {
  const signedValue = signed(value, sourceWidth);
  return Number(signedValue & ((1n << BigInt(targetWidth)) - 1n));
}

function signed(value: number, width: number): bigint {
  const bits = BigInt(width);
  const mask = (1n << bits) - 1n;
  const normalized = BigInt(value) & mask;
  const sign = 1n << (bits - 1n);
  return normalized & sign ? normalized - (1n << bits) : normalized;
}
