import { decodeModRm, type DecodedModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";
import { pushStack } from "../memory/stack.js";
import { loadCodeSegment } from "../protection/segment-loader.js";
import type { SegmentName } from "../state/segments.js";
import { add, subtract, EFLAGS_CARRY, type ArithmeticWidth } from "./arithmetic.js";

export function executeGroupFourFive(context: RebuiltExecutionContext): void {
  const { opcode } = context.instruction;
  if (opcode !== 0xfe && opcode !== 0xff)
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt Group Four/Five coverage`);
  const width: ArithmeticWidth = opcode === 0xfe ? 8 : context.instruction.prefixes.operandSize;
  const offset = context.instruction.opcodeOffset + 1;
  const modRm = decodeModRm(
    context.reader,
    offset,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  if (modRm.reg === 0 || modRm.reg === 1) {
    incrementDecrement(context, modRm, width, modRm.reg === 0);
    context.state.advanceEip(context.instruction.length + modRm.bytes);
    return;
  }
  if (opcode === 0xfe || modRm.reg === 7)
    throw new Error("FE/FF extension requires rebuilt #UD delivery");
  if (modRm.reg === 3 || modRm.reg === 5) return executeFarControl(context, modRm);
  const operand = readRm(context, modRm, width);
  const operandSize = context.instruction.prefixes.operandSize;
  const fallthrough = context.state.readEip() + context.instruction.length + modRm.bytes;
  if (modRm.reg === 2) {
    pushStack(context.memory, context.state, operandSize, fallthrough);
    writeTarget(context, operand);
  } else if (modRm.reg === 4) writeTarget(context, operand);
  else if (modRm.reg === 6) {
    pushStack(context.memory, context.state, operandSize, operand);
    context.state.advanceEip(context.instruction.length + modRm.bytes);
  } else throw new Error("Unsupported rebuilt Group Five extension");
}

function executeFarControl(context: RebuiltExecutionContext, modRm: DecodedModRm): void {
  if (modRm.registerDirect) throw new Error("FF far control requires a memory pointer");
  const width = context.instruction.prefixes.operandSize;
  const memory = modRm.memory!;
  const segment: SegmentName = context.instruction.prefixes.segmentOverride ?? memory.segment;
  const offset =
    width === 16
      ? context.memory.read16(segment, memory.offset, context.instruction.prefixes.addressSize)
      : context.memory.read32(segment, memory.offset, context.instruction.prefixes.addressSize);
  const selector = context.memory.read16(
    segment,
    memory.offset + width / 8,
    context.instruction.prefixes.addressSize
  );
  const returnEip = context.state.readEip() + context.instruction.length + modRm.bytes;
  const returnCs = context.state.readSegment("cs").selector;
  loadCodeSegment(context.memory, context.state, selector);
  if (modRm.reg === 3) {
    pushStack(context.memory, context.state, width, returnCs);
    pushStack(context.memory, context.state, width, returnEip);
  }
  context.state.writeEip(width === 16 ? offset & 0xffff : offset);
}

function incrementDecrement(
  context: RebuiltExecutionContext,
  modRm: DecodedModRm,
  width: ArithmeticWidth,
  increment: boolean
): void {
  const flags = context.state.flags.read();
  const source = readRm(context, modRm, width);
  const result = increment ? add(flags, source, 1, width) : subtract(flags, source, 1, width);
  context.state.flags.write((result.flags & ~EFLAGS_CARRY) | (flags & EFLAGS_CARRY));
  writeRm(context, modRm, width, result.value);
}

function writeTarget(context: RebuiltExecutionContext, value: number): void {
  context.state.writeEip(context.state.readSegment("cs").default32 ? value >>> 0 : value & 0xffff);
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
  if (modRm.registerDirect) {
    writeRegister(context, modRm.rm, width, value);
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
