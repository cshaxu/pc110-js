import type { RebuiltExecutionContext } from "../execution.js";

export function executeSignExtension(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode !== 0x98 && opcode !== 0x99)
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt sign-extension coverage`);
  const wide = context.instruction.prefixes.operandSize === 32;
  if (opcode === 0x98) {
    if (wide) context.state.registers.write32(0, signExtend(context.state.registers.read16(0), 16));
    else context.state.registers.write16(0, signExtend(context.state.registers.read8(0), 8));
  } else if (wide) {
    context.state.registers.write32(
      2,
      context.state.registers.read32(0) & 0x8000_0000 ? 0xffff_ffff : 0
    );
  } else {
    context.state.registers.write16(2, context.state.registers.read16(0) & 0x8000 ? 0xffff : 0);
  }
  context.state.advanceEip(context.instruction.length);
}

function signExtend(value: number, width: number): number {
  return width === 8 ? (value << 24) >> 24 : (value << 16) >> 16;
}
