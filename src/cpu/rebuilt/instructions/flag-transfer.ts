import type { RebuiltExecutionContext } from "../execution.js";
import {
  EFLAGS_AUXILIARY_CARRY,
  EFLAGS_CARRY,
  EFLAGS_PARITY,
  EFLAGS_SIGN,
  EFLAGS_ZERO
} from "./arithmetic.js";

const TRANSFER_MASK =
  EFLAGS_CARRY | EFLAGS_PARITY | EFLAGS_AUXILIARY_CARRY | EFLAGS_ZERO | EFLAGS_SIGN;

export function executeFlagTransfer(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode !== 0x9e && opcode !== 0x9f)
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt flag-transfer coverage`);
  if (opcode === 0x9e) {
    const ah = context.state.registers.read8(4);
    context.state.flags.write((context.state.flags.read() & ~TRANSFER_MASK) | (ah & TRANSFER_MASK));
  } else context.state.registers.write8(4, (context.state.flags.read() & TRANSFER_MASK) | 0x02);
  context.state.advanceEip(context.instruction.length);
}
