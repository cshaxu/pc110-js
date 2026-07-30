import { decodeModRm, type DecodedModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";
import { popStack, pushStack } from "../memory/stack.js";
import { loadDataSegment, loadStackSegment } from "../protection/segment-loader.js";
import type { SegmentName } from "../state/segments.js";
import {
  add,
  decimalAdjustFlags,
  logical,
  subtract,
  type ArithmeticResult,
  type ArithmeticWidth,
  EFLAGS_CARRY
} from "./arithmetic.js";

type Operation = "add" | "or" | "adc" | "sbb" | "and" | "sub" | "xor" | "cmp";

const OPERATIONS: ReadonlyMap<number, Operation> = new Map([
  [0x00, "add"],
  [0x08, "or"],
  [0x10, "adc"],
  [0x18, "sbb"],
  [0x20, "and"],
  [0x28, "sub"],
  [0x30, "xor"],
  [0x38, "cmp"]
]);

export function executeFirstIntervalArithmetic(context: RebuiltExecutionContext): void {
  const { instruction } = context;
  if (executeAdjust(context)) return;
  if (executeSegmentStack(context)) return;
  const operation = OPERATIONS.get(instruction.opcode & 0xf8);
  const form = instruction.opcode & 0x07;
  if (!operation || form > 5) {
    throw new Error(`Opcode 0x${instruction.opcode.toString(16)} is outside rebuilt ALU coverage`);
  }
  const width: ArithmeticWidth =
    form === 0 || form === 2 || form === 4 ? 8 : instruction.prefixes.operandSize;
  const operandOffset = instruction.opcodeOffset + 1;
  if (form <= 3) {
    const modRm = decodeModRm(
      context.reader,
      operandOffset,
      instruction.prefixes.addressSize,
      context.state.registers
    );
    const destination =
      form === 0 || form === 1
        ? readRm(context, modRm, width)
        : readRegister(context, modRm.reg, width);
    const source =
      form === 0 || form === 1
        ? readRegister(context, modRm.reg, width)
        : readRm(context, modRm, width);
    const result = apply(context, operation, destination, source, width);
    if (operation !== "cmp") {
      if (form === 0 || form === 1) writeRm(context, modRm, width, result.value);
      else writeRegister(context, modRm.reg, width, result.value);
    }
    context.state.advanceEip(operandOffset + modRm.bytes);
    return;
  }
  const immediateBytes = width / 8;
  const source = readImmediate(context, operandOffset, immediateBytes);
  const destination = readRegister(context, 0, width);
  const result = apply(context, operation, destination, source, width);
  if (operation !== "cmp") writeRegister(context, 0, width, result.value);
  context.state.advanceEip(operandOffset + immediateBytes);
}

function executeSegmentStack(context: RebuiltExecutionContext): boolean {
  const segment = new Map<number, SegmentName>([
    [0x06, "es"],
    [0x07, "es"],
    [0x0e, "cs"],
    [0x16, "ss"],
    [0x17, "ss"],
    [0x1e, "ds"],
    [0x1f, "ds"]
  ]).get(context.instruction.opcode);
  if (!segment) return false;
  const pop =
    context.instruction.opcode === 0x07 ||
    context.instruction.opcode === 0x17 ||
    context.instruction.opcode === 0x1f;
  if (pop) {
    const selector =
      popStack(context.memory, context.state, context.instruction.prefixes.operandSize) & 0xffff;
    if (segment === "ss") {
      loadStackSegment(context.memory, context.state, selector);
      context.state.inhibitMaskableInterruptsForNextInstruction();
    } else if (segment !== "cs") loadDataSegment(context.memory, context.state, segment, selector);
    else throw new Error("POP CS is not available in the rebuilt 80386 path");
  } else
    pushStack(
      context.memory,
      context.state,
      context.instruction.prefixes.operandSize,
      context.state.readSegment(segment).selector
    );
  context.state.advanceEip(context.instruction.length);
  return true;
}

function executeAdjust(context: RebuiltExecutionContext): boolean {
  const opcode = context.instruction.opcode;
  if (![0x27, 0x2f, 0x37, 0x3f].includes(opcode)) return false;
  const flags = context.state.flags.read();
  const oldAl = context.state.registers.read8(0);
  const oldCarry = Boolean(flags & EFLAGS_CARRY);
  const oldAuxiliaryCarry = Boolean(flags & 0x10);
  let al = oldAl;
  let carry = oldCarry;
  let auxiliaryCarry = false;
  if (opcode === 0x27 || opcode === 0x2f) {
    const addAdjust = opcode === 0x27;
    if ((oldAl & 0x0f) > 9 || oldAuxiliaryCarry) {
      al = (al + (addAdjust ? 0x06 : -0x06)) & 0xff;
      auxiliaryCarry = true;
      carry = oldCarry || (addAdjust ? oldAl > 0xf9 : oldAl < 0x06);
    }
    if ((addAdjust ? (al & 0xf0) > 0x90 : al > 0x9f) || carry) {
      al = (al + (addAdjust ? 0x60 : -0x60)) & 0xff;
      carry = true;
    } else carry = false;
    context.state.registers.write8(0, al);
    context.state.flags.write(decimalAdjustFlags(flags, al, carry, auxiliaryCarry));
  } else {
    const addAdjust = opcode === 0x37;
    if ((oldAl & 0x0f) > 9 || oldAuxiliaryCarry) {
      context.state.registers.write8(0, (oldAl + (addAdjust ? 0x06 : -0x06)) & 0x0f);
      context.state.registers.write8(
        4,
        (context.state.registers.read8(4) + (addAdjust ? 1 : -1)) & 0xff
      );
      context.state.flags.set(EFLAGS_CARRY | 0x10);
    } else {
      context.state.registers.write8(0, oldAl & 0x0f);
      context.state.flags.clear(EFLAGS_CARRY | 0x10);
    }
  }
  context.state.advanceEip(context.instruction.length);
  return true;
}

function apply(
  context: RebuiltExecutionContext,
  operation: Operation,
  left: number,
  right: number,
  width: ArithmeticWidth
): ArithmeticResult {
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
  return result;
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

function memorySegment(context: RebuiltExecutionContext, modRm: DecodedModRm): SegmentName {
  return context.instruction.prefixes.segmentOverride ?? modRm.memory!.segment;
}

function readRm(
  context: RebuiltExecutionContext,
  modRm: DecodedModRm,
  width: ArithmeticWidth
): number {
  if (modRm.registerDirect) return readRegister(context, modRm.rm, width);
  const memory = modRm.memory!;
  const segment = memorySegment(context, modRm);
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
  const segment = memorySegment(context, modRm);
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
