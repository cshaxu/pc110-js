import { decodeModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";
import { deliverFault } from "../events/interrupt-delivery.js";
import type { SegmentName } from "../state/segments.js";

const EFLAGS_ZERO = 0x00000040;

export function executeArpl(context: RebuiltExecutionContext): void {
  if (!(context.state.readCr0() & 1) || context.state.isVirtual8086())
    return deliverFault(context.memory, context.state, 6, context.state.readEip());
  const offset = context.instruction.opcodeOffset + 1;
  const modRm = decodeModRm(
    context.reader,
    offset,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  const source = context.state.registers.read16(modRm.reg);
  const target = readTarget(context, modRm);
  if ((target & 3) < (source & 3)) {
    writeTarget(context, modRm, (target & ~3) | (source & 3));
    context.state.flags.set(EFLAGS_ZERO);
  } else context.state.flags.clear(EFLAGS_ZERO);
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}

function readTarget(
  context: RebuiltExecutionContext,
  modRm: ReturnType<typeof decodeModRm>
): number {
  if (modRm.registerDirect) return context.state.registers.read16(modRm.rm);
  const memory = modRm.memory!;
  const segment: SegmentName = context.instruction.prefixes.segmentOverride ?? memory.segment;
  return context.memory.read16(segment, memory.offset, context.instruction.prefixes.addressSize);
}

function writeTarget(
  context: RebuiltExecutionContext,
  modRm: ReturnType<typeof decodeModRm>,
  value: number
): void {
  if (modRm.registerDirect) context.state.registers.write16(modRm.rm, value);
  else {
    const memory = modRm.memory!;
    const segment: SegmentName = context.instruction.prefixes.segmentOverride ?? memory.segment;
    context.memory.write16(segment, memory.offset, value, context.instruction.prefixes.addressSize);
  }
}
