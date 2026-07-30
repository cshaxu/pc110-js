import { decodeModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";
import type { SegmentName } from "../state/segments.js";
import { logical, type ArithmeticWidth } from "./arithmetic.js";

export function executeTestModRm(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode !== 0x84 && opcode !== 0x85)
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt TEST coverage`);
  const width: ArithmeticWidth = opcode === 0x84 ? 8 : context.instruction.prefixes.operandSize;
  const offset = context.instruction.opcodeOffset + 1;
  const modRm = decodeModRm(
    context.reader,
    offset,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  const left = readRm(
    context,
    modRm.registerDirect,
    modRm.rm,
    modRm.memory?.offset,
    modRm.memory?.segment,
    width
  );
  const right = readRegister(context, modRm.reg, width);
  context.state.flags.write(logical(context.state.flags.read(), left & right, width).flags);
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

function readRm(
  context: RebuiltExecutionContext,
  direct: boolean,
  register: number,
  offset: number | undefined,
  defaultSegment: "ds" | "ss" | undefined,
  width: ArithmeticWidth
): number {
  if (direct) return readRegister(context, register, width);
  const segment: SegmentName = context.instruction.prefixes.segmentOverride ?? defaultSegment!;
  return width === 8
    ? context.memory.read8(segment, offset!, context.instruction.prefixes.addressSize)
    : width === 16
      ? context.memory.read16(segment, offset!, context.instruction.prefixes.addressSize)
      : context.memory.read32(segment, offset!, context.instruction.prefixes.addressSize);
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
