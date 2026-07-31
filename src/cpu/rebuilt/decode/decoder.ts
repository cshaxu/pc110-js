import { decodePrefixes, type PrefixState } from "./prefix.js";
import type { InstructionReader } from "./instruction-reader.js";

export interface DecodedInstruction {
  readonly startEip: number;
  readonly prefixes: PrefixState;
  readonly opcodeOffset: number;
  readonly opcode: number;
  readonly secondaryOpcode?: number;
  readonly modRm?: DecodedModRm;
  readonly length: number;
}

export interface DecodedModRm {
  readonly raw: number;
  readonly mod: number;
  readonly reg: number;
  readonly rm: number;
  readonly memory: boolean;
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
  const secondaryOpcode =
    opcode === 0x0f ? reader.readCodeByte(opcodeOffset + 1) & 0xff : undefined;
  const modRmOffset = opcodeOffset + (opcode === 0x0f ? 2 : 1);
  const modRm = hasTimingModRm(opcode, secondaryOpcode)
    ? decodeModRm(reader.readCodeByte(modRmOffset) & 0xff)
    : undefined;
  return {
    startEip: startEip >>> 0,
    prefixes,
    opcodeOffset,
    opcode,
    secondaryOpcode,
    modRm,
    length: opcodeOffset + (opcode === 0x0f ? 2 : 1)
  };
}

function hasTimingModRm(opcode: number, secondaryOpcode: number | undefined): boolean {
  if (opcode === 0x0f) return secondaryOpcode === 0x01;
  return (
    (opcode >= 0x38 && opcode <= 0x3b) ||
    (opcode >= 0x80 && opcode <= 0x83) ||
    (opcode >= 0x88 && opcode <= 0x8b) ||
    opcode === 0x8e ||
    opcode === 0xf6 ||
    opcode === 0xf7 ||
    opcode === 0xff
  );
}

function decodeModRm(raw: number): DecodedModRm {
  const mod = raw >>> 6;
  return { raw, mod, reg: (raw >>> 3) & 7, rm: raw & 7, memory: mod !== 3 };
}
