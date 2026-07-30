import type { RebuiltExecutionContext } from "../execution.js";
import { deliverFault } from "../events/interrupt-delivery.js";
import { popStack, pushStack } from "../memory/stack.js";

const EFLAGS_IOPL = 0x00003000;
const EFLAGS_RF = 0x00010000;
const EFLAGS_VM = 0x00020000;

export function executeFlagStack(context: RebuiltExecutionContext): void {
  const width = context.instruction.prefixes.operandSize;
  if (context.state.isVirtual8086()) {
    const iopl = (context.state.flags.read() & EFLAGS_IOPL) >>> 12;
    if (iopl !== 3 || (context.instruction.opcode === 0x9d && width !== 16))
      return deliverFault(context.memory, context.state, 13, context.state.readEip(), 0);
  }
  if (context.instruction.opcode === 0x9c) {
    const flags = context.state.flags.read();
    pushStack(
      context.memory,
      context.state,
      width,
      width === 16 ? flags & 0xffff : flags & ~(EFLAGS_VM | EFLAGS_RF)
    );
  } else if (context.instruction.opcode === 0x9d) {
    const incoming = popStack(context.memory, context.state, width);
    const protectedMode = Boolean(context.state.readCr0() & 1);
    const code = context.state.readSegment("cs");
    const cpl = code.dpl ?? code.selector & 3;
    const mask = !protectedMode
      ? 0
      : cpl === 0
        ? width === 16
          ? 0xffff0000
          : EFLAGS_VM
        : width === 16
          ? 0xffff0000 | EFLAGS_IOPL
          : EFLAGS_VM | EFLAGS_RF | EFLAGS_IOPL;
    context.state.flags.write((incoming & ~mask) | (context.state.flags.read() & mask));
  } else
    throw new Error(
      `Opcode 0x${context.instruction.opcode.toString(16)} is outside rebuilt flag-stack coverage`
    );
  context.state.advanceEip(context.instruction.length);
}
