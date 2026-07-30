import { decodePrefixes, type PrefixState } from "./prefix.js";
import type { InstructionReader } from "./instruction-reader.js";

export interface DecodedInstruction {
  readonly startEip: number;
  readonly prefixes: PrefixState;
  readonly opcodeOffset: number;
  readonly opcode: number;
  readonly secondaryOpcode?: number;
  readonly length: number;
}

export class InstructionLengthError extends Error {
  public constructor(readonly faultEip: number) {
    super("Instruction exceeds the 15-byte architectural limit");
  }
}

export function decodeInstruction(
  reader: InstructionReader,
  startEip: number,
  codeDefault32: boolean
): DecodedInstruction {
  const defaultSize = codeDefault32 ? 32 : 16;
  const prefixes = decodePrefixes(reader, defaultSize, defaultSize);
  if (prefixes.bytes >= 15) throw new InstructionLengthError(startEip >>> 0);

  const opcodeOffset = prefixes.bytes;
  const opcode = reader.readCodeByte(opcodeOffset) & 0xff;
  return {
    startEip: startEip >>> 0,
    prefixes,
    opcodeOffset,
    opcode,
    secondaryOpcode: opcode === 0x0f ? reader.readCodeByte(opcodeOffset + 1) & 0xff : undefined,
    length: opcodeOffset + (opcode === 0x0f ? 2 : 1)
  };
}
