import type { RebuiltExecutionContext } from "../execution.js";
import { deliverInterrupt } from "../events/interrupt-delivery.js";
import { popStack } from "../memory/stack.js";
import { loadCodeSegment } from "../protection/segment-loader.js";
import { EFLAGS_OVERFLOW } from "./arithmetic.js";

export function executeInterrupt(context: RebuiltExecutionContext): void {
  const { opcode } = context.instruction;
  if (opcode === 0xcc) return interrupt(context, 3, 1);
  if (opcode === 0xcd)
    return interrupt(context, context.reader.readCodeByte(context.instruction.opcodeOffset + 1), 2);
  if (opcode === 0xce) {
    if (!(context.state.flags.read() & EFLAGS_OVERFLOW)) {
      context.state.advanceEip(context.instruction.length);
      return;
    }
    return interrupt(context, 4, 1);
  }
  if (opcode === 0xcf) return executeIret(context);
  throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt interrupt coverage`);
}

function interrupt(context: RebuiltExecutionContext, vector: number, bytes: number): void {
  const fallthrough = context.state.readEip() + context.instruction.length + bytes - 1;
  deliverInterrupt(context.memory, context.state, {
    vector,
    returnEip: context.state.codeDefault32() ? fallthrough >>> 0 : fallthrough & 0xffff,
    operandSize: context.instruction.prefixes.operandSize,
    software: true
  });
}

function executeIret(context: RebuiltExecutionContext): void {
  const operandSize = context.instruction.prefixes.operandSize;
  const target = popStack(context.memory, context.state, operandSize);
  const selector = popStack(context.memory, context.state, operandSize) & 0xffff;
  const flags = popStack(context.memory, context.state, operandSize);
  if (context.state.readCr0() & 1) {
    const currentPrivilege = context.state.readSegment("cs").selector & 3;
    if ((selector & 3) !== currentPrivilege)
      throw new Error("Protected-mode outer-privilege IRET requires rebuilt stack switching");
  }
  loadCodeSegment(context.memory, context.state, selector);
  context.state.flags.write(flags);
  context.state.writeEip(operandSize === 16 ? target & 0xffff : target);
}
