import type { OperandSize } from "../decode/prefix.js";
import type { RebuiltExecutionContext } from "../execution.js";
import { popStack, pushStack } from "../memory/stack.js";
import { loadCodeSegment } from "../protection/segment-loader.js";

const ENTER_LEVEL_MASK = 0x1f;

export function executeStackFrameControl(context: RebuiltExecutionContext): void {
  switch (context.instruction.opcode) {
    case 0xc2:
    case 0xc3:
      executeNearReturn(context);
      return;
    case 0xc8:
      executeEnter(context);
      return;
    case 0xca:
    case 0xcb:
      executeFarReturn(context);
      return;
    case 0xc9:
      executeLeave(context);
      return;
    default:
      throw new Error(
        `Opcode 0x${context.instruction.opcode.toString(16)} is outside rebuilt stack-frame control coverage`
      );
  }
}

function executeFarReturn(context: RebuiltExecutionContext): void {
  const operandSize = context.instruction.prefixes.operandSize;
  const target = popStack(context.memory, context.state, operandSize);
  const selector = popStack(context.memory, context.state, operandSize) & 0xffff;
  const cleanup =
    context.instruction.opcode === 0xca
      ? readUint16(context, context.instruction.opcodeOffset + 1)
      : 0;
  try {
    loadCodeSegment(context.memory, context.state, selector);
  } catch (error) {
    restoreFarReturnFrame(context, operandSize);
    throw error;
  }
  adjustStackPointer(context, cleanup);
  context.state.writeEip(operandSize === 16 ? target & 0xffff : target);
}

function restoreFarReturnFrame(context: RebuiltExecutionContext, operandSize: OperandSize): void {
  const bytes = (operandSize / 8) * 2;
  if (context.state.stackDefault32())
    context.state.registers.write32(4, context.state.registers.read32(4) + bytes);
  else context.state.registers.write16(4, context.state.registers.read16(4) + bytes);
}

function executeNearReturn(context: RebuiltExecutionContext): void {
  const operandSize = context.instruction.prefixes.operandSize;
  const target = popStack(context.memory, context.state, operandSize);
  const cleanup =
    context.instruction.opcode === 0xc2
      ? readUint16(context, context.instruction.opcodeOffset + 1)
      : 0;
  adjustStackPointer(context, cleanup);
  context.state.writeEip(context.state.codeDefault32() ? target >>> 0 : target & 0xffff);
}

function executeEnter(context: RebuiltExecutionContext): void {
  const operandSize = context.instruction.prefixes.operandSize;
  const allocation = readUint16(context, context.instruction.opcodeOffset + 1);
  const level =
    context.reader.readCodeByte(context.instruction.opcodeOffset + 3) & ENTER_LEVEL_MASK;
  const stack32 = context.state.stackDefault32();
  pushStack(context.memory, context.state, operandSize, readFramePointer(context, stack32));
  const frame = readStackPointer(context, stack32);

  if (level > 0) {
    let source = readFramePointer(context, stack32);
    for (let index = 1; index < level; index += 1) {
      source = decrementStackPointer(source, operandSize / 8, stack32);
      pushStack(
        context.memory,
        context.state,
        operandSize,
        readStack(context, source, operandSize)
      );
    }
    pushStack(context.memory, context.state, operandSize, frame);
  }

  writeFramePointer(context, stack32, frame);
  writeStackPointer(context, stack32, decrementStackPointer(frame, allocation, stack32));
  context.state.advanceEip(context.instruction.length + 3);
}

function executeLeave(context: RebuiltExecutionContext): void {
  const operandSize = context.instruction.prefixes.operandSize;
  const stack32 = context.state.stackDefault32();
  writeStackPointer(context, stack32, readFramePointer(context, stack32));
  writeFramePointer(context, stack32, popStack(context.memory, context.state, operandSize));
  context.state.advanceEip(context.instruction.length);
}

function readStack(
  context: RebuiltExecutionContext,
  offset: number,
  operandSize: OperandSize
): number {
  const addressSize = context.state.stackDefault32() ? 32 : 16;
  return operandSize === 32
    ? context.memory.read32("ss", offset, addressSize)
    : context.memory.read16("ss", offset, addressSize);
}

function adjustStackPointer(context: RebuiltExecutionContext, amount: number): void {
  const stack32 = context.state.stackDefault32();
  writeStackPointer(context, stack32, readStackPointer(context, stack32) + amount);
}

function readStackPointer(context: RebuiltExecutionContext, stack32: boolean): number {
  return stack32 ? context.state.registers.read32(4) : context.state.registers.read16(4);
}

function writeStackPointer(
  context: RebuiltExecutionContext,
  stack32: boolean,
  value: number
): void {
  if (stack32) context.state.registers.write32(4, value);
  else context.state.registers.write16(4, value);
}

function readFramePointer(context: RebuiltExecutionContext, stack32: boolean): number {
  return stack32 ? context.state.registers.read32(5) : context.state.registers.read16(5);
}

function writeFramePointer(
  context: RebuiltExecutionContext,
  stack32: boolean,
  value: number
): void {
  if (stack32) context.state.registers.write32(5, value);
  else context.state.registers.write16(5, value);
}

function decrementStackPointer(value: number, amount: number, stack32: boolean): number {
  return stack32 ? (value - amount) >>> 0 : (value - amount) & 0xffff;
}

function readUint16(context: RebuiltExecutionContext, offset: number): number {
  return context.reader.readCodeByte(offset) | (context.reader.readCodeByte(offset + 1) << 8);
}
