import { decodeModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";
import { deliverFault } from "../events/interrupt-delivery.js";
import { popStack } from "../memory/stack.js";
import type { SegmentName } from "../state/segments.js";

export function executePopModRm(context: RebuiltExecutionContext): void {
  const offset = context.instruction.opcodeOffset + 1;
  const modRm = decodeModRm(
    context.reader,
    offset,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  if (modRm.reg !== 0)
    return deliverFault(context.memory, context.state, 6, context.state.readEip());
  const width = context.instruction.prefixes.operandSize;
  const value = popStack(context.memory, context.state, width);
  if (modRm.registerDirect) {
    if (width === 16) context.state.registers.write16(modRm.rm, value);
    else context.state.registers.write32(modRm.rm, value);
  } else {
    const memory = modRm.memory!;
    const segment: SegmentName = context.instruction.prefixes.segmentOverride ?? memory.segment;
    if (width === 16)
      context.memory.write16(
        segment,
        memory.offset,
        value,
        context.instruction.prefixes.addressSize
      );
    else
      context.memory.write32(
        segment,
        memory.offset,
        value,
        context.instruction.prefixes.addressSize
      );
  }
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}
