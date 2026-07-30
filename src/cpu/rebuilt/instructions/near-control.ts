import type { RebuiltExecutionContext } from "../execution.js";
import { pushStack } from "../memory/stack.js";
import { loadCodeSegment } from "../protection/segment-loader.js";

export function executeNearControl(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode !== 0x9a && opcode !== 0xe8 && opcode !== 0xe9 && opcode !== 0xea && opcode !== 0xeb)
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt near-control coverage`);
  const operandSize = context.instruction.prefixes.operandSize;
  if (opcode === 0x9a || opcode === 0xea) return executeFarControl(context, operandSize);
  const bytes = opcode === 0xeb ? 1 : operandSize / 8;
  const displacement = signedImmediate(context, context.instruction.opcodeOffset + 1, bytes);
  const fallthrough = context.state.readEip() + context.instruction.length + bytes;
  if (opcode === 0xe8) pushStack(context.memory, context.state, operandSize, fallthrough);
  const target = fallthrough + displacement;
  context.state.writeEip(context.state.codeDefault32() ? target >>> 0 : target & 0xffff);
}

function executeFarControl(context: RebuiltExecutionContext, operandSize: 16 | 32): void {
  const offsetBytes = operandSize / 8;
  const offset = unsignedImmediate(context, context.instruction.opcodeOffset + 1, offsetBytes);
  const selector = unsignedImmediate(
    context,
    context.instruction.opcodeOffset + 1 + offsetBytes,
    2
  );
  const returnEip = context.state.readEip() + context.instruction.length + offsetBytes + 2;
  const returnCs = context.state.readSegment("cs").selector;
  loadCodeSegment(context.memory, context.state, selector);
  if (context.instruction.opcode === 0x9a) {
    pushStack(context.memory, context.state, operandSize, returnCs);
    pushStack(context.memory, context.state, operandSize, returnEip);
  }
  context.state.writeEip(operandSize === 16 ? offset & 0xffff : offset);
}

function signedImmediate(context: RebuiltExecutionContext, offset: number, bytes: number): number {
  const value = unsignedImmediate(context, offset, bytes);
  return bytes === 1 ? (value << 24) >> 24 : bytes === 2 ? (value << 16) >> 16 : value;
}

function unsignedImmediate(
  context: RebuiltExecutionContext,
  offset: number,
  bytes: number
): number {
  let value = 0;
  for (let index = 0; index < bytes; index += 1)
    value |= (context.reader.readCodeByte(offset + index) & 0xff) << (index * 8);
  return value >>> 0;
}
