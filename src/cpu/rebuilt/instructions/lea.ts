import { decodeModRm } from "../addressing/modrm.js";
import type { RebuiltExecutionContext } from "../execution.js";

export function executeLea(context: RebuiltExecutionContext): void {
  if (context.instruction.opcode !== 0x8d)
    throw new Error(
      `Opcode 0x${context.instruction.opcode.toString(16)} is outside rebuilt LEA coverage`
    );
  const offset = context.instruction.opcodeOffset + 1;
  const modRm = decodeModRm(
    context.reader,
    offset,
    context.instruction.prefixes.addressSize,
    context.state.registers
  );
  if (modRm.registerDirect) throw new Error("LEA requires a memory addressing form");
  const value = modRm.memory!.offset;
  if (context.instruction.prefixes.operandSize === 16)
    context.state.registers.write16(modRm.reg, value);
  else context.state.registers.write32(modRm.reg, value);
  context.state.advanceEip(context.instruction.length + modRm.bytes);
}
