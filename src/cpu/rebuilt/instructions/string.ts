import type { RebuiltExecutionContext } from "../execution.js";
import type { ArithmeticWidth } from "./arithmetic.js";
import { EFLAGS_ZERO, subtract } from "./arithmetic.js";
import type { SegmentName } from "../state/segments.js";

const EFLAGS_DIRECTION = 0x00000400;

export function executeString(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  const width: ArithmeticWidth = isByteOpcode(opcode)
    ? 8
    : context.instruction.prefixes.operandSize;
  const addressSize = context.instruction.prefixes.addressSize;
  const repeated = context.instruction.prefixes.repeat;

  if (repeated !== undefined && readCounter(context, addressSize) === 0) {
    context.state.advanceEip(context.instruction.length);
    return;
  }

  if (opcode === 0xa4 || opcode === 0xa5) moveString(context, width, addressSize);
  else if (opcode === 0xa6 || opcode === 0xa7) compareString(context, width, addressSize);
  else if (opcode === 0xaa || opcode === 0xab) storeString(context, width, addressSize);
  else if (opcode === 0xac || opcode === 0xad) loadString(context, width, addressSize);
  else if (opcode === 0xae || opcode === 0xaf) scanString(context, width, addressSize);
  else throw new Error(`Unsupported rebuilt string opcode 0x${opcode.toString(16)}`);

  if (repeated === undefined) {
    context.state.advanceEip(context.instruction.length);
    return;
  }

  const next = decrementCounter(context, addressSize);
  if (next !== 0 && shouldRepeat(context, opcode, repeated)) return;
  context.state.advanceEip(context.instruction.length);
}

function moveString(
  context: RebuiltExecutionContext,
  width: ArithmeticWidth,
  addressSize: 16 | 32
): void {
  const source = readIndex(context, 6, addressSize);
  const destination = readIndex(context, 7, addressSize);
  const value = readMemory(
    context,
    context.instruction.prefixes.segmentOverride ?? "ds",
    source,
    addressSize,
    width
  );
  writeMemory(context, "es", destination, addressSize, width, value);
  advanceIndices(context, addressSize, width, true, true);
}

function compareString(
  context: RebuiltExecutionContext,
  width: ArithmeticWidth,
  addressSize: 16 | 32
): void {
  const source = readMemory(
    context,
    context.instruction.prefixes.segmentOverride ?? "ds",
    readIndex(context, 6, addressSize),
    addressSize,
    width
  );
  const destination = readMemory(
    context,
    "es",
    readIndex(context, 7, addressSize),
    addressSize,
    width
  );
  context.state.flags.write(subtract(context.state.flags.read(), source, destination, width).flags);
  advanceIndices(context, addressSize, width, true, true);
}

function storeString(
  context: RebuiltExecutionContext,
  width: ArithmeticWidth,
  addressSize: 16 | 32
): void {
  writeMemory(
    context,
    "es",
    readIndex(context, 7, addressSize),
    addressSize,
    width,
    readAccumulator(context, width)
  );
  advanceIndices(context, addressSize, width, false, true);
}

function loadString(
  context: RebuiltExecutionContext,
  width: ArithmeticWidth,
  addressSize: 16 | 32
): void {
  const value = readMemory(
    context,
    context.instruction.prefixes.segmentOverride ?? "ds",
    readIndex(context, 6, addressSize),
    addressSize,
    width
  );
  writeAccumulator(context, width, value);
  advanceIndices(context, addressSize, width, true, false);
}

function scanString(
  context: RebuiltExecutionContext,
  width: ArithmeticWidth,
  addressSize: 16 | 32
): void {
  const destination = readMemory(
    context,
    "es",
    readIndex(context, 7, addressSize),
    addressSize,
    width
  );
  context.state.flags.write(
    subtract(context.state.flags.read(), readAccumulator(context, width), destination, width).flags
  );
  advanceIndices(context, addressSize, width, false, true);
}

function shouldRepeat(
  context: RebuiltExecutionContext,
  opcode: number,
  repeat: "rep" | "repne"
): boolean {
  if (![0xa6, 0xa7, 0xae, 0xaf].includes(opcode)) return true;
  const zero = context.state.flags.has(EFLAGS_ZERO);
  return repeat === "rep" ? zero : !zero;
}

function advanceIndices(
  context: RebuiltExecutionContext,
  addressSize: 16 | 32,
  width: ArithmeticWidth,
  source: boolean,
  destination: boolean
): void {
  const delta = context.state.flags.read() & EFLAGS_DIRECTION ? -(width / 8) : width / 8;
  if (source) writeIndex(context, 6, addressSize, readIndex(context, 6, addressSize) + delta);
  if (destination) writeIndex(context, 7, addressSize, readIndex(context, 7, addressSize) + delta);
}

function readCounter(context: RebuiltExecutionContext, size: 16 | 32): number {
  return size === 16 ? context.state.registers.read16(1) : context.state.registers.read32(1);
}

function decrementCounter(context: RebuiltExecutionContext, size: 16 | 32): number {
  const value = readCounter(context, size) - 1;
  if (size === 16) {
    context.state.registers.write16(1, value);
    return context.state.registers.read16(1);
  }
  context.state.registers.write32(1, value);
  return context.state.registers.read32(1);
}

function readIndex(context: RebuiltExecutionContext, register: number, size: 16 | 32): number {
  return size === 16
    ? context.state.registers.read16(register)
    : context.state.registers.read32(register);
}

function writeIndex(
  context: RebuiltExecutionContext,
  register: number,
  size: 16 | 32,
  value: number
): void {
  if (size === 16) context.state.registers.write16(register, value);
  else context.state.registers.write32(register, value);
}

function readAccumulator(context: RebuiltExecutionContext, width: ArithmeticWidth): number {
  if (width === 8) return context.state.registers.read8(0);
  if (width === 16) return context.state.registers.read16(0);
  return context.state.registers.read32(0);
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

function readMemory(
  context: RebuiltExecutionContext,
  segment: SegmentName,
  offset: number,
  addressSize: 16 | 32,
  width: ArithmeticWidth
): number {
  if (width === 8) return context.memory.read8(segment, offset, addressSize);
  if (width === 16) return context.memory.read16(segment, offset, addressSize);
  return context.memory.read32(segment, offset, addressSize);
}

function writeMemory(
  context: RebuiltExecutionContext,
  segment: SegmentName,
  offset: number,
  addressSize: 16 | 32,
  width: ArithmeticWidth,
  value: number
): void {
  if (width === 8) context.memory.write8(segment, offset, value, addressSize);
  else if (width === 16) context.memory.write16(segment, offset, value, addressSize);
  else context.memory.write32(segment, offset, value, addressSize);
}

function isByteOpcode(opcode: number): boolean {
  return (
    opcode === 0xa4 || opcode === 0xa6 || opcode === 0xaa || opcode === 0xac || opcode === 0xae
  );
}
