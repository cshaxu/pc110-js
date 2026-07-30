import type { RebuiltExecutionContext } from "../execution.js";
import type { SegmentName } from "../state/segments.js";

export function executeXlat(context: RebuiltExecutionContext): void {
  if (context.instruction.opcode !== 0xd7)
    throw new Error(
      `Opcode 0x${context.instruction.opcode.toString(16)} is outside rebuilt XLAT coverage`
    );
  const addressSize = context.instruction.prefixes.addressSize;
  const base =
    addressSize === 16 ? context.state.registers.read16(3) : context.state.registers.read32(3);
  const offset =
    addressSize === 16
      ? (base + context.state.registers.read8(0)) & 0xffff
      : (base + context.state.registers.read8(0)) >>> 0;
  const segment: SegmentName = context.instruction.prefixes.segmentOverride ?? "ds";
  context.state.registers.write8(0, context.memory.read8(segment, offset, addressSize));
  context.state.advanceEip(context.instruction.length);
}
