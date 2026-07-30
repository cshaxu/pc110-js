import { decodeModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";
import { loadDataSegment, loadStackSegment } from "../protection/segment-loader.js";
import type { SegmentName } from "../state/segments.js";

const SEGMENTS: readonly SegmentName[] = ["es", "cs", "ss", "ds", "fs", "gs"];

export function executeSegmentMove(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  const modRm = decodeModRm(
    context.reader,
    context.instruction.opcodeOffset + 1,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  if (opcode === 0x8c) {
    const segment = segmentFromReg(modRm.reg);
    writeRm16(context, modRm, context.state.readSegment(segment).selector);
  } else if (opcode === 0x8e) {
    const segment = segmentFromReg(modRm.reg);
    if (segment === "cs") throw new Error("MOV cannot load CS");
    const selector = readRm16(context, modRm);
    if (segment === "ss") loadStackSegment(context.memory, context.state, selector);
    else loadDataSegment(context.memory, context.state, segment, selector);
  } else throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt segment-MOV coverage`);
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

export function executeLoadFarPointer(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode !== 0xc4 && opcode !== 0xc5)
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt LES/LDS coverage`);
  const modRm = decodeModRm(
    context.reader,
    context.instruction.opcodeOffset + 1,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  if (modRm.registerDirect) throw new Error("LES/LDS requires a memory far pointer");
  const memory = modRm.memory!;
  const segment = context.instruction.prefixes.segmentOverride ?? memory.segment;
  const width = context.instruction.prefixes.operandSize;
  const offset =
    width === 16
      ? context.memory.read16(segment, memory.offset, context.instruction.prefixes.addressSize)
      : context.memory.read32(segment, memory.offset, context.instruction.prefixes.addressSize);
  const selector = context.memory.read16(
    segment,
    memory.offset + width / 8,
    context.instruction.prefixes.addressSize
  );
  loadDataSegment(context.memory, context.state, opcode === 0xc4 ? "es" : "ds", selector);
  if (width === 16) context.state.registers.write16(modRm.reg, offset);
  else context.state.registers.write32(modRm.reg, offset);
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

function segmentFromReg(register: number): SegmentName {
  const segment = SEGMENTS[register];
  if (!segment) throw new Error("Segment-register encoding is undefined on 80386");
  return segment;
}

function readRm16(context: RebuiltExecutionContext, modRm: ReturnType<typeof decodeModRm>): number {
  if (modRm.registerDirect) return context.state.registers.read16(modRm.rm);
  const memory = modRm.memory!;
  return context.memory.read16(
    context.instruction.prefixes.segmentOverride ?? memory.segment,
    memory.offset,
    context.instruction.prefixes.addressSize
  );
}

function writeRm16(
  context: RebuiltExecutionContext,
  modRm: ReturnType<typeof decodeModRm>,
  value: number
): void {
  if (modRm.registerDirect) context.state.registers.write16(modRm.rm, value);
  else {
    const memory = modRm.memory!;
    context.memory.write16(
      context.instruction.prefixes.segmentOverride ?? memory.segment,
      memory.offset,
      value,
      context.instruction.prefixes.addressSize
    );
  }
}
