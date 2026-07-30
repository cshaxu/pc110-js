import type { RebuiltExecutionContext } from "../execution.js";

export function executeAccumulatorExchange(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode < 0x90 || opcode > 0x97) {
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt accumulator XCHG coverage`);
  }
  const register = opcode & 0x07;
  if (register !== 0) {
    if (context.instruction.prefixes.operandSize === 16) {
      const accumulator = context.state.registers.read16(0);
      context.state.registers.write16(0, context.state.registers.read16(register));
      context.state.registers.write16(register, accumulator);
    } else {
      const accumulator = context.state.registers.read32(0);
      context.state.registers.write32(0, context.state.registers.read32(register));
      context.state.registers.write32(register, accumulator);
    }
  }
  context.state.advanceEip(context.instruction.length);
}
