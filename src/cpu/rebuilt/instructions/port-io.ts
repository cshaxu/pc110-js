import type { RebuiltExecutionContext } from "../execution.js";
import { normalizePort, type PortWidth } from "../io/port-bus.js";

export function executePortIo(context: RebuiltExecutionContext): void {
  const opcode = context.instruction.opcode;
  if (![0xe4, 0xe5, 0xe6, 0xe7, 0xec, 0xed, 0xee, 0xef].includes(opcode)) {
    throw new Error(`Opcode 0x${opcode.toString(16)} is outside rebuilt port-I/O coverage`);
  }
  if (!context.io) throw new Error("Rebuilt I/O bus is unavailable");
  const isInput = opcode === 0xe4 || opcode === 0xe5 || opcode === 0xec || opcode === 0xed;
  const immediatePort = opcode >= 0xe4 && opcode <= 0xe7;
  const byteAccess = opcode === 0xe4 || opcode === 0xe6 || opcode === 0xec || opcode === 0xee;
  const width: PortWidth = byteAccess ? 8 : context.instruction.prefixes.operandSize;
  const port = normalizePort(
    immediatePort
      ? context.reader.readCodeByte(context.instruction.opcodeOffset + 1)
      : context.state.registers.read16(2)
  );
  if (isInput) writeAccumulator(context, context.io.read(port, width), width);
  else context.io.write(port, readAccumulator(context, width), width);
  context.state.advanceEip(context.instruction.length + (immediatePort ? 1 : 0));
}

function readAccumulator(context: RebuiltExecutionContext, width: PortWidth): number {
  if (width === 8) return context.state.registers.read8(0);
  return width === 16 ? context.state.registers.read16(0) : context.state.registers.read32(0);
}

function writeAccumulator(context: RebuiltExecutionContext, value: number, width: PortWidth): void {
  if (width === 8) context.state.registers.write8(0, value);
  else if (width === 16) context.state.registers.write16(0, value);
  else context.state.registers.write32(0, value);
}
