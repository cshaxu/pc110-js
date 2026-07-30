import type { RebuiltExecutionContext } from "../execution.js";
import { pushStack } from "../memory/stack.js";

export function executeNearControl(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode !== 0xe8 && opcode !== 0xe9 && opcode !== 0xea && opcode !== 0xeb)
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt near-control coverage`);
  const operandSize = context.instruction.prefixes.operandSize;
  if (opcode === 0xea) return executeFarJump(context, operandSize);
  const bytes = opcode === 0xeb ? 1 : operandSize / 8;
  const displacement = signedImmediate(context, context.instruction.opcodeOffset + 1, bytes);
  const fallthrough = context.state.readEip() + context.instruction.length + bytes;
  if (opcode === 0xe8) pushStack(context.memory, context.state, operandSize, fallthrough);
  const target = fallthrough + displacement;
  context.state.writeEip(
    context.state.readSegment("cs").default32 ? target >>> 0 : target & 0xffff
  );
}

function executeFarJump(context: RebuiltExecutionContext, operandSize: 16 | 32): void {
  if (context.state.readCr0() & 0x00000001) {
    throw new Error("Rebuilt protected-mode far JMP selector validation is not implemented");
  }
  const offsetBytes = operandSize / 8;
  const offset = unsignedImmediate(context, context.instruction.opcodeOffset + 1, offsetBytes);
  const selector = unsignedImmediate(
    context,
    context.instruction.opcodeOffset + 1 + offsetBytes,
    2
  );
  context.state.writeSegment("cs", {
    selector,
    base: (selector << 4) >>> 0,
    limit: 0xffff,
    default32: false
  });
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
