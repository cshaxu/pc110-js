import { decodeModRm, type DecodedModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";
import { deliverFault } from "../events/interrupt-delivery.js";
import { popStack, pushStack } from "../memory/stack.js";
import { loadDataSegment, loadStackSegment } from "../protection/segment-loader.js";
import type { SegmentName } from "../state/segments.js";
import {
  EFLAGS_CARRY,
  EFLAGS_OVERFLOW,
  EFLAGS_PARITY,
  EFLAGS_SIGN,
  EFLAGS_ZERO,
  type ArithmeticWidth
} from "./arithmetic.js";

const RESULT_FLAGS = EFLAGS_CARRY | EFLAGS_PARITY | EFLAGS_ZERO | EFLAGS_SIGN;

export function executeExtended(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.secondaryOpcode;
  if (
    opcode === undefined ||
    ![
      0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xab, 0xac, 0xad, 0xae,
      0xaf, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xba, 0xbb, 0xbc, 0xbd, 0xbe, 0xbf
    ].includes(opcode)
  )
    throw new Error("Opcode is outside rebuilt 0F A0-AF coverage");
  if ([0xa2, 0xa6, 0xa7, 0xaa, 0xae].includes(opcode))
    return deliverFault(context.memory, context.state, 6, context.state.readEip());
  if (opcode === 0xa0 || opcode === 0xa8)
    return executePushSegment(context, opcode === 0xa0 ? "fs" : "gs");
  if (opcode === 0xa1 || opcode === 0xa9)
    return executePopSegment(context, opcode === 0xa1 ? "fs" : "gs");
  if ([0xa3, 0xab, 0xb3, 0xbb].includes(opcode)) return executeRegisterBit(context, opcode);
  if (opcode === 0xba) return executeImmediateBit(context);
  if ([0xa4, 0xa5, 0xac, 0xad].includes(opcode)) return executeDoubleShift(context, opcode);
  if (opcode === 0xaf) return executeTwoOperandImul(context);
  if ([0xb2, 0xb4, 0xb5].includes(opcode)) return executeLoadFar(context, opcode);
  if (opcode === 0xb6 || opcode === 0xb7) return executeMovzx(context, opcode === 0xb6 ? 8 : 16);
  if (opcode === 0xbc || opcode === 0xbd) return executeBitScan(context, opcode === 0xbc);
  if (opcode === 0xbe || opcode === 0xbf) return executeMovsx(context, opcode === 0xbe ? 8 : 16);
  throw new Error(`Unsupported rebuilt 0F opcode 0x${opcode.toString(16)}`);
}

function executePushSegment(context: RebuiltExecutionContext, segment: "fs" | "gs"): void {
  pushStack(
    context.memory,
    context.state,
    context.instruction.prefixes.operandSize,
    context.state.readSegment(segment).selector
  );
  context.state.advanceEip(context.instruction.length);
}

function executePopSegment(context: RebuiltExecutionContext, segment: "fs" | "gs"): void {
  const selector = popStack(
    context.memory,
    context.state,
    context.instruction.prefixes.operandSize
  );
  loadDataSegment(context.memory, context.state, segment, selector);
  context.state.advanceEip(context.instruction.length);
}

function executeRegisterBit(context: RebuiltExecutionContext, opcode: number): void {
  const width = context.instruction.prefixes.operandSize;
  const modRm = decode(context);
  const bitIndex = readRegister(context, modRm.reg, width);
  const operand = bitOperand(context, modRm, width, bitIndex);
  const bit = normalizedBit(bitIndex, width);
  const wasSet = Boolean(operand.value & (1 << bit));
  replaceCarry(context, wasSet);
  if (opcode !== 0xa3) {
    const next =
      opcode === 0xab
        ? operand.value | (1 << bit)
        : opcode === 0xb3
          ? operand.value & ~(1 << bit)
          : operand.value ^ (1 << bit);
    operand.write(next);
  }
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

function executeImmediateBit(context: RebuiltExecutionContext): void {
  const width = context.instruction.prefixes.operandSize;
  const modRm = decode(context);
  const operation = modRm.reg;
  if (operation < 4) return deliverFault(context.memory, context.state, 6, context.state.readEip());
  const immediateOffset = context.instruction.opcodeOffset + 2 + modRm.bytes;
  const bitIndex = context.reader.readCodeByte(immediateOffset);
  const operand = bitOperand(context, modRm, width, bitIndex, false);
  const bit = normalizedBit(bitIndex, width);
  const wasSet = Boolean(operand.value & (1 << bit));
  replaceCarry(context, wasSet);
  if (operation !== 4) {
    const next =
      operation === 5
        ? operand.value | (1 << bit)
        : operation === 6
          ? operand.value & ~(1 << bit)
          : operand.value ^ (1 << bit);
    operand.write(next);
  }
  context.state.advanceEip(context.instruction.length + modRm.bytes + 1);
}

function executeDoubleShift(context: RebuiltExecutionContext, opcode: number): void {
  const width = context.instruction.prefixes.operandSize;
  const modRm = decode(context);
  const immediate = opcode === 0xa4 || opcode === 0xac;
  const count =
    (immediate
      ? context.reader.readCodeByte(context.instruction.opcodeOffset + 2 + modRm.bytes)
      : context.state.registers.read8(1)) & 0x1f;
  if (count > width) {
    context.state.advanceEip(context.instruction.length + modRm.bytes + (immediate ? 1 : 0));
    return;
  }
  if (count !== 0) {
    const destination = readRm(context, modRm, width);
    const source = readRegister(context, modRm.reg, width);
    const result = doubleShift(
      destination,
      source,
      count,
      width,
      opcode === 0xa4 || opcode === 0xa5
    );
    writeRm(context, modRm, width, result.value);
    context.state.flags.write(result.flags(context.state.flags.read()));
  }
  context.state.advanceEip(context.instruction.length + modRm.bytes + (immediate ? 1 : 0));
}

function executeTwoOperandImul(context: RebuiltExecutionContext): void {
  const width = context.instruction.prefixes.operandSize;
  const modRm = decode(context);
  const product =
    signed(readRegister(context, modRm.reg, width), width) *
    signed(readRm(context, modRm, width), width);
  const mask = (1n << BigInt(width)) - 1n;
  const result = Number(product & mask);
  const overflow = product !== signed(result, width);
  const flags = context.state.flags.read() & ~(EFLAGS_CARRY | EFLAGS_OVERFLOW);
  context.state.flags.write(overflow ? flags | EFLAGS_CARRY | EFLAGS_OVERFLOW : flags);
  writeRegister(context, modRm.reg, width, result);
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

function executeLoadFar(context: RebuiltExecutionContext, opcode: number): void {
  const width = context.instruction.prefixes.operandSize;
  const modRm = decode(context);
  if (modRm.registerDirect)
    return deliverFault(context.memory, context.state, 6, context.state.readEip());
  const memory = modRm.memory!;
  const segment = context.instruction.prefixes.segmentOverride ?? memory.segment;
  const offset = readMemory(context, segment, memory.offset, width);
  const selector = context.memory.read16(
    segment,
    memory.offset + width / 8,
    context.instruction.prefixes.addressSize
  );
  if (opcode === 0xb2) loadStackSegment(context.memory, context.state, selector);
  else loadDataSegment(context.memory, context.state, opcode === 0xb4 ? "fs" : "gs", selector);
  writeRegister(context, modRm.reg, width, offset);
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

function executeMovzx(context: RebuiltExecutionContext, sourceWidth: 8 | 16): void {
  const modRm = decode(context);
  const value = sourceWidth === 8 ? readRm8(context, modRm) : readRm(context, modRm, 16);
  writeRegister(
    context,
    modRm.reg,
    sourceWidth === 16 ? 32 : context.instruction.prefixes.operandSize,
    value
  );
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

function executeBitScan(context: RebuiltExecutionContext, forward: boolean): void {
  const width = context.instruction.prefixes.operandSize;
  const modRm = decode(context);
  const source = readRm(context, modRm, width);
  const flags = context.state.flags.read() & ~EFLAGS_ZERO;
  if (source === 0) context.state.flags.write(flags | EFLAGS_ZERO);
  else {
    context.state.flags.write(flags);
    const index = forward ? leastSetBit(source, width) : mostSetBit(source, width);
    writeRegister(context, modRm.reg, width, index);
  }
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

function executeMovsx(context: RebuiltExecutionContext, sourceWidth: 8 | 16): void {
  const modRm = decode(context);
  const source = sourceWidth === 8 ? readRm8(context, modRm) : readRm(context, modRm, 16);
  const destinationWidth = sourceWidth === 16 ? 32 : context.instruction.prefixes.operandSize;
  const value = Number(signed(source, sourceWidth) & ((1n << BigInt(destinationWidth)) - 1n));
  writeRegister(context, modRm.reg, destinationWidth, value);
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

function decode(context: RebuiltExecutionContext): DecodedModRm {
  return decodeModRm(
    context.reader,
    context.instruction.opcodeOffset + 2,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
}

function bitOperand(
  context: RebuiltExecutionContext,
  modRm: DecodedModRm,
  width: 16 | 32,
  index: number,
  signedIndex = true
) {
  if (modRm.registerDirect)
    return {
      value: readRegister(context, modRm.rm, width),
      write: (value: number) => writeRegister(context, modRm.rm, width, value)
    };
  const memory = modRm.memory!;
  const element = Math.floor((signedIndex ? signedNumber(index, width) : index) / width);
  const offset = memory.offset + element * (width / 8);
  const segment = context.instruction.prefixes.segmentOverride ?? memory.segment;
  return {
    value: readMemory(context, segment, offset, width),
    write: (value: number) => writeMemory(context, segment, offset, width, value)
  };
}

function normalizedBit(index: number, width: 16 | 32): number {
  return (index & (width - 1)) >>> 0;
}

function leastSetBit(value: number, width: 16 | 32): number {
  const normalized = width === 16 ? value & 0xffff : value >>> 0;
  let index = 0;
  while (((normalized >>> index) & 1) === 0) index += 1;
  return index;
}

function mostSetBit(value: number, width: 16 | 32): number {
  const normalized = width === 16 ? value & 0xffff : value >>> 0;
  for (let index = width - 1; index >= 0; index -= 1) {
    if ((normalized & (1 << index)) !== 0) return index;
  }
  throw new Error("Bit scan requires a nonzero source");
}

function doubleShift(
  destination: number,
  source: number,
  count: number,
  width: ArithmeticWidth,
  left: boolean
) {
  const bits = BigInt(width);
  const mask = (1n << bits) - 1n;
  const d = BigInt(destination) & mask;
  const s = BigInt(source) & mask;
  const result = left
    ? ((d << BigInt(count)) | (s >> (bits - BigInt(count)))) & mask
    : ((d >> BigInt(count)) | (s << (bits - BigInt(count)))) & mask;
  const value = Number(result);
  const carry = left
    ? Boolean((d >> (bits - BigInt(count))) & 1n)
    : Boolean((d >> (BigInt(count) - 1n)) & 1n);
  return {
    value,
    flags: (prior: number) => {
      let next = prior & ~(RESULT_FLAGS | EFLAGS_OVERFLOW);
      if (carry) next |= EFLAGS_CARRY;
      if (value === 0) next |= EFLAGS_ZERO;
      if (value & (width === 16 ? 0x8000 : 0x80000000)) next |= EFLAGS_SIGN;
      if (evenParity(value & 0xff)) next |= EFLAGS_PARITY;
      if (count !== 1) next = (next & ~EFLAGS_OVERFLOW) | (prior & EFLAGS_OVERFLOW);
      else if (
        left
          ? Boolean(value & (width === 16 ? 0x8000 : 0x80000000)) !== carry
          : Boolean(destination & (width === 16 ? 0x8000 : 0x80000000)) !==
            Boolean(value & (width === 16 ? 0x8000 : 0x80000000))
      )
        next |= EFLAGS_OVERFLOW;
      return next >>> 0;
    }
  };
}

function replaceCarry(context: RebuiltExecutionContext, value: boolean): void {
  const flags = context.state.flags.read() & ~EFLAGS_CARRY;
  context.state.flags.write(value ? flags | EFLAGS_CARRY : flags);
}

function readRm(context: RebuiltExecutionContext, modRm: DecodedModRm, width: 16 | 32): number {
  if (modRm.registerDirect) return readRegister(context, modRm.rm, width);
  const memory = modRm.memory!;
  return readMemory(
    context,
    context.instruction.prefixes.segmentOverride ?? memory.segment,
    memory.offset,
    width
  );
}
function readRm8(context: RebuiltExecutionContext, modRm: DecodedModRm): number {
  if (modRm.registerDirect) return context.state.registers.read8(modRm.rm);
  const memory = modRm.memory!;
  return context.memory.read8(
    context.instruction.prefixes.segmentOverride ?? memory.segment,
    memory.offset,
    context.instruction.prefixes.addressSize
  );
}
function writeRm(
  context: RebuiltExecutionContext,
  modRm: DecodedModRm,
  width: 16 | 32,
  value: number
): void {
  if (modRm.registerDirect) return writeRegister(context, modRm.rm, width, value);
  const memory = modRm.memory!;
  writeMemory(
    context,
    context.instruction.prefixes.segmentOverride ?? memory.segment,
    memory.offset,
    width,
    value
  );
}
function readMemory(
  context: RebuiltExecutionContext,
  segment: SegmentName,
  offset: number,
  width: 16 | 32
): number {
  return width === 16
    ? context.memory.read16(segment, offset, context.instruction.prefixes.addressSize)
    : context.memory.read32(segment, offset, context.instruction.prefixes.addressSize);
}
function writeMemory(
  context: RebuiltExecutionContext,
  segment: SegmentName,
  offset: number,
  width: 16 | 32,
  value: number
): void {
  if (width === 16)
    context.memory.write16(segment, offset, value, context.instruction.prefixes.addressSize);
  else context.memory.write32(segment, offset, value, context.instruction.prefixes.addressSize);
}
function readRegister(context: RebuiltExecutionContext, index: number, width: 16 | 32): number {
  return width === 16
    ? context.state.registers.read16(index)
    : context.state.registers.read32(index);
}
function writeRegister(
  context: RebuiltExecutionContext,
  index: number,
  width: 16 | 32,
  value: number
): void {
  if (width === 16) context.state.registers.write16(index, value);
  else context.state.registers.write32(index, value);
}
function signed(value: number, width: ArithmeticWidth): bigint {
  const bits = BigInt(width);
  const normalized = BigInt(value) & ((1n << bits) - 1n);
  return normalized & (1n << (bits - 1n)) ? normalized - (1n << bits) : normalized;
}
function signedNumber(value: number, width: ArithmeticWidth): number {
  return Number(signed(value, width));
}
function evenParity(value: number): boolean {
  let bits = value;
  let parity = true;
  while (bits) {
    parity = !parity;
    bits &= bits - 1;
  }
  return parity;
}
