import type { RebuiltExecutionContext } from "../execution.js";

const CARRY = 0x00000001;
const DIRECTION = 0x00000400;

export function executeFlagControl(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  const flags = context.state.flags;
  if (opcode === 0xf5) flags.write(flags.read() ^ CARRY);
  else if (opcode === 0xf8) flags.clear(CARRY);
  else if (opcode === 0xf9) flags.set(CARRY);
  else if (opcode === 0xfc) flags.clear(DIRECTION);
  else if (opcode === 0xfd) flags.set(DIRECTION);
  else throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt flag-control coverage`);
  context.state.advanceEip(context.instruction.length);
}
