import { decodeModRm, type DecodedModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";
import type { SegmentName } from "../state/segments.js";
import {
  EFLAGS_AUXILIARY_CARRY,
  EFLAGS_CARRY,
  EFLAGS_OVERFLOW,
  EFLAGS_PARITY,
  EFLAGS_SIGN,
  EFLAGS_ZERO,
  type ArithmeticWidth
} from "./arithmetic.js";

type Operation = "rol" | "ror" | "rcl" | "rcr" | "shl" | "shr" | "sar";
const OPERATIONS: readonly (Operation | undefined)[] = [
  "rol",
  "ror",
  "rcl",
  "rcr",
  "shl",
  "shr",
  undefined,
  "sar"
];

export function executeShiftRotate(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (![0xc0, 0xc1, 0xd0, 0xd1, 0xd2, 0xd3].includes(opcode))
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt Group Two coverage`);
  const width: ArithmeticWidth =
    opcode === 0xc0 || opcode === 0xd0 || opcode === 0xd2
      ? 8
      : context.instruction.prefixes.operandSize;
  const offset = context.instruction.opcodeOffset + 1;
  const modRm = decodeModRm(
    context.reader,
    offset,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  const operation = OPERATIONS[modRm.reg];
  if (!operation) throw new Error("Group Two /6 requires rebuilt #UD delivery");
  const immediate = opcode === 0xc0 || opcode === 0xc1;
  const fromCl = opcode === 0xd2 || opcode === 0xd3;
  const count = immediate
    ? context.reader.readCodeByte(offset + modRm.bytes)
    : fromCl
      ? context.state.registers.read8(1)
      : 1;
  const source = readRm(context, modRm, width);
  const result = shiftRotate(source, count, width, operation, context.state.flags.read());
  if (result.count !== 0) {
    writeRm(context, modRm, width, result.value);
    context.state.flags.write(result.flags);
  }
  context.state.advanceEip(context.instruction.length + modRm.bytes + (immediate ? 1 : 0));
}

export function shiftRotate(
  value: number,
  rawCount: number,
  width: ArithmeticWidth,
  operation: Operation,
  flags: number
) {
  const mask = width === 8 ? 0xff : width === 16 ? 0xffff : 0xffff_ffff;
  const sign = width === 8 ? 0x80 : width === 16 ? 0x8000 : 0x8000_0000;
  let count = rawCount & 0x1f;
  if (operation === "rol" || operation === "ror") count %= width;
  else if (operation === "rcl" || operation === "rcr") count %= width + 1;
  if (count === 0) return { value: value & mask, flags, count };
  let result = value & mask;
  let carry = Boolean(flags & EFLAGS_CARRY);
  for (let index = 0; index < count; index += 1) {
    if (operation === "rol" || operation === "rcl" || operation === "shl") {
      const nextCarry = Boolean(result & sign);
      result = ((result << 1) & mask) | (operation === "rcl" && carry ? 1 : 0);
      carry = nextCarry;
    } else {
      const nextCarry = Boolean(result & 1);
      if (operation === "ror" || operation === "rcr")
        result = (result >>> 1) | (operation === "rcr" && carry ? sign : nextCarry ? sign : 0);
      else if (operation === "sar")
        result = ((result & sign ? result | ~mask : result) >> 1) & mask;
      else result >>>= 1;
      carry = nextCarry;
    }
  }
  let next = (flags & ~EFLAGS_CARRY) | (carry ? EFLAGS_CARRY : 0);
  if (operation === "shl" || operation === "shr" || operation === "sar") {
    next &= ~(EFLAGS_SIGN | EFLAGS_ZERO | EFLAGS_PARITY | EFLAGS_AUXILIARY_CARRY | EFLAGS_OVERFLOW);
    if (result === 0) next |= EFLAGS_ZERO;
    if (result & sign) next |= EFLAGS_SIGN;
    if (evenParity(result & 0xff)) next |= EFLAGS_PARITY;
    if (count === 1) {
      const sourceSecondSign = Boolean(value & (sign >>> 1));
      const sourceSign = Boolean(value & sign);
      if (operation === "shl" && sourceSecondSign !== sourceSign)
        next = (next | EFLAGS_OVERFLOW) >>> 0;
      if (operation === "shr" && value & sign) next |= EFLAGS_OVERFLOW;
    } else next = (next & ~EFLAGS_OVERFLOW) | (flags & EFLAGS_OVERFLOW);
  } else if (count === 1) {
    next &= ~EFLAGS_OVERFLOW;
    if (operation === "rol" || operation === "rcl") {
      if (Boolean(result & sign) !== carry) next |= EFLAGS_OVERFLOW;
    } else if (Boolean(result & sign) !== Boolean(result & (sign >>> 1))) next |= EFLAGS_OVERFLOW;
  }
  return { value: result >>> 0, flags: next >>> 0, count };
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
function evenParity(value: number): boolean {
  let bits = value;
  let parity = true;
  while (bits) {
    parity = !parity;
    bits &= bits - 1;
  }
  return parity;
}
