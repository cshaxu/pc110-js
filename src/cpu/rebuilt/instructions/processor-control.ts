import type { RebuiltExecutionContext } from "../execution.js";
import { deliverFault } from "../events/interrupt-delivery.js";

const EFLAGS_INTERRUPT = 0x00000200;
const EFLAGS_IOPL = 0x00003000;

export function executeProcessorControl(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode === 0xf4) return executeHalt(context);
  if (opcode === 0xfa || opcode === 0xfb) return executeInterruptFlag(context, opcode === 0xfb);
  throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt processor-control coverage`);
}

function executeHalt(context: RebuiltExecutionContext): void {
  if (protectedMode(context) && currentPrivilege(context) !== 0) return generalProtection(context);
  context.state.advanceEip(context.instruction.length);
  context.state.halt();
}

function executeInterruptFlag(context: RebuiltExecutionContext, enabled: boolean): void {
  if (protectedMode(context) && currentPrivilege(context) > iopl(context))
    return generalProtection(context);
  if (enabled) context.state.flags.set(EFLAGS_INTERRUPT);
  else context.state.flags.clear(EFLAGS_INTERRUPT);
  if (enabled) context.state.inhibitMaskableInterruptsForNextInstruction();
  context.state.advanceEip(context.instruction.length);
}

function generalProtection(context: RebuiltExecutionContext): void {
  deliverFault(context.memory, context.state, 13, context.state.readEip(), 0);
}

function protectedMode(context: RebuiltExecutionContext): boolean {
  return Boolean(context.state.readCr0() & 1);
}

function currentPrivilege(context: RebuiltExecutionContext): number {
  if (context.state.isVirtual8086()) return 3;
  return context.state.readSegment("cs").selector & 3;
}

function iopl(context: RebuiltExecutionContext): number {
  return (context.state.flags.read() & EFLAGS_IOPL) >>> 12;
}
