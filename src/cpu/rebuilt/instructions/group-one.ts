import { decodeModRm, type DecodedModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";
import type { SegmentName } from "../state/segments.js";
import { add, logical, subtract, EFLAGS_CARRY, type ArithmeticWidth } from "./arithmetic.js";

type Operation = "add" | "or" | "adc" | "sbb" | "and" | "sub" | "xor" | "cmp";

const OPERATIONS: readonly Operation[] = ["add", "or", "adc", "sbb", "and", "sub", "xor", "cmp"];

export function executeGroupOne(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode !== 0x80 && opcode !== 0x81 && opcode !== 0x83) {
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt Group One coverage`);
  }
  const width: ArithmeticWidth = opcode === 0x80 ? 8 : context.instruction.prefixes.operandSize;
  const modRmOffset = context.instruction.opcodeOffset + 1;
  const modRm = decodeModRm(
    context.reader,
    modRmOffset,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  const immediateBytes = opcode === 0x83 ? 1 : width / 8;
  const immediate = readImmediate(context, modRmOffset + modRm.bytes, immediateBytes);
  const right = opcode === 0x83 ? signExtend(immediate, width) : immediate;
  const left = readRm(context, modRm, width);
  const result = apply(context, OPERATIONS[modRm.reg]!, left, right, width);
  if (modRm.reg !== 7) writeRm(context, modRm, width, result);
  context.state.advanceEip(context.instruction.length + modRm.bytes + immediateBytes);
}

function apply(
  context: RebuiltExecutionContext,
  operation: Operation,
  left: number,
  right: number,
  width: ArithmeticWidth
): number {
  const flags = context.state.flags.read();
  const carry = flags & EFLAGS_CARRY ? 1 : 0;
  const result =
    operation === "add"
      ? add(flags, left, right, width)
      : operation === "adc"
        ? add(flags, left, right, width, carry)
        : operation === "sub" || operation === "cmp"
          ? subtract(flags, left, right, width)
          : operation === "sbb"
            ? subtract(flags, left, right, width, carry)
            : logical(
                flags,
                operation === "or"
                  ? left | right
                  : operation === "and"
                    ? left & right
                    : left ^ right,
                width
              );
  context.state.flags.write(result.flags);
  return result.value;
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

function signExtend(value: number, width: ArithmeticWidth): number {
  const signed = (value << 24) >> 24;
  return width === 32 ? signed >>> 0 : signed & 0xffff;
}
