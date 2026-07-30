import type { RebuiltExecutionContext } from "../execution.js";
import { EFLAGS_ZERO } from "./arithmetic.js";

export function executeLoop(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (opcode < 0xe0 || opcode > 0xe3)
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt LOOP coverage`);
  const addressSize = context.instruction.prefixes.addressSize;
  const counter =
    addressSize === 16 ? context.state.registers.read16(1) : context.state.registers.read32(1);
  let take = false;
  if (opcode === 0xe3) take = counter === 0;
  else {
    const next = addressSize === 16 ? (counter - 1) & 0xffff : (counter - 1) >>> 0;
    if (addressSize === 16) context.state.registers.write16(1, next);
    else context.state.registers.write32(1, next);
    const zero = context.state.flags.has(EFLAGS_ZERO);
    take = next !== 0 && (opcode === 0xe2 || (opcode === 0xe1 ? zero : !zero));
  }
  const displacement =
    (context.reader.readCodeByte(context.instruction.opcodeOffset + 1) << 24) >> 24;
  const fallthrough = context.state.readEip() + context.instruction.length + 1;
  const target = take ? fallthrough + displacement : fallthrough;
  context.state.writeEip(
    context.state.readSegment("cs").default32 ? target >>> 0 : target & 0xffff
  );
}
