import { decodeModRm, type DecodedModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";
import { deliverFault } from "../events/interrupt-delivery.js";
import type { DescriptorTable } from "../state/cpu-state.js";
import type { SegmentName } from "../state/segments.js";

export function executeSystemGroup(context: RebuiltExecutionContext): void {
  if (context.instruction.secondaryOpcode !== 0x01)
    throw new Error("Rebuilt system group requires 0F 01");
  const modRm = decode(context);
  if (modRm.reg <= 3) return executeDescriptorTable(context, modRm);
  if (modRm.reg === 4) return executeSmsw(context, modRm);
  if (modRm.reg === 6) return executeLmsw(context, modRm);
  return deliverFault(context.memory, context.state, 6, context.state.readEip());
}

function executeDescriptorTable(context: RebuiltExecutionContext, modRm: DecodedModRm): void {
  if (modRm.registerDirect)
    return deliverFault(context.memory, context.state, 6, context.state.readEip());
  const table =
    modRm.reg === 0 || modRm.reg === 2 ? context.state.readGdtr() : context.state.readIdtr();
  const memory = modRm.memory!;
  const segment = context.instruction.prefixes.segmentOverride ?? memory.segment;
  if (modRm.reg <= 1) writeTable(context, segment, memory.offset, table);
  else {
    const loaded = readTable(context, segment, memory.offset);
    if (modRm.reg === 2) context.state.writeGdtr(loaded);
    else context.state.writeIdtr(loaded);
  }
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

function executeSmsw(context: RebuiltExecutionContext, modRm: DecodedModRm): void {
  const width = modRm.registerDirect ? context.instruction.prefixes.operandSize : 16;
  writeRm(context, modRm, width, context.state.readCr0() & 0xffff);
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

function executeLmsw(context: RebuiltExecutionContext, modRm: DecodedModRm): void {
  const value = readRm16(context, modRm);
  const previous = context.state.readCr0();
  const low = (value & 0x0f) | (previous & 1);
  context.state.writeCr0((previous & 0xfffffff0) | low);
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

function writeTable(
  context: RebuiltExecutionContext,
  segment: SegmentName,
  offset: number,
  table: DescriptorTable
): void {
  context.memory.write16(segment, offset, table.limit, context.instruction.prefixes.addressSize);
  if (context.instruction.prefixes.operandSize === 16) {
    context.memory.write32(
      segment,
      offset + 2,
      table.base & 0xffffff,
      context.instruction.prefixes.addressSize
    );
  } else
    context.memory.write32(
      segment,
      offset + 2,
      table.base,
      context.instruction.prefixes.addressSize
    );
}

function readTable(
  context: RebuiltExecutionContext,
  segment: SegmentName,
  offset: number
): DescriptorTable {
  const limit = context.memory.read16(segment, offset, context.instruction.prefixes.addressSize);
  const base = context.memory.read32(segment, offset + 2, context.instruction.prefixes.addressSize);
  return { limit, base: context.instruction.prefixes.operandSize === 16 ? base & 0xffffff : base };
}

function readRm16(context: RebuiltExecutionContext, modRm: DecodedModRm): number {
  if (modRm.registerDirect) return context.state.registers.read16(modRm.rm);
  const memory = modRm.memory!;
  return context.memory.read16(
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
  if (modRm.registerDirect) {
    if (width === 16) context.state.registers.write16(modRm.rm, value);
    else context.state.registers.write32(modRm.rm, value);
    return;
  }
  const memory = modRm.memory!;
  const segment = context.instruction.prefixes.segmentOverride ?? memory.segment;
  if (width === 16)
    context.memory.write16(segment, memory.offset, value, context.instruction.prefixes.addressSize);
  else
    context.memory.write32(segment, memory.offset, value, context.instruction.prefixes.addressSize);
}
