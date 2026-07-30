import type { AddressSize } from "../decode/prefix.js";
import type { InstructionReader } from "../decode/instruction-reader.js";

export type DefaultSegment = "ds" | "ss";

export interface RegisterReader {
  read16(index: number): number;
  read32(index: number): number;
}

export interface DecodedMemoryOperand {
  readonly offset: number;
  readonly segment: DefaultSegment;
  readonly displacementBytes: number;
  readonly sibBytes: number;
}

export interface DecodedModRm {
  readonly mod: number;
  readonly reg: number;
  readonly rm: number;
  readonly registerDirect: boolean;
  readonly bytes: number;
  readonly memory?: DecodedMemoryOperand;
}

export function decodeModRm(
  reader: InstructionReader,
  modRmOffset: number,
  addressSize: AddressSize,
  registers: RegisterReader
): DecodedModRm {
  const encoded = reader.readCodeByte(modRmOffset) & 0xff;
  const mod = encoded >>> 6;
  const reg = (encoded >>> 3) & 0x07;
  const rm = encoded & 0x07;
  if (mod === 3) return { mod, reg, rm, registerDirect: true, bytes: 1 };

  const memory =
    addressSize === 16
      ? decode16(reader, modRmOffset, mod, rm, registers)
      : decode32(reader, modRmOffset, mod, rm, registers);
  return {
    mod,
    reg,
    rm,
    registerDirect: false,
    bytes: 1 + memory.sibBytes + memory.displacementBytes,
    memory
  };
}

function decode16(
  reader: InstructionReader,
  offset: number,
  mod: number,
  rm: number,
  registers: RegisterReader
): DecodedMemoryOperand {
  const direct = mod === 0 && rm === 6;
  const displacementBytes = mod === 1 ? 1 : mod === 2 || direct ? 2 : 0;
  const displacement = signedDisplacement(reader, offset + 1, displacementBytes);
  const bx = registers.read16(3);
  const bp = registers.read16(5);
  const si = registers.read16(6);
  const di = registers.read16(7);
  const form = direct
    ? { base: 0, segment: "ds" as const }
    : [
        { base: bx + si, segment: "ds" as const },
        { base: bx + di, segment: "ds" as const },
        { base: bp + si, segment: "ss" as const },
        { base: bp + di, segment: "ss" as const },
        { base: si, segment: "ds" as const },
        { base: di, segment: "ds" as const },
        { base: bp, segment: "ss" as const },
        { base: bx, segment: "ds" as const }
      ][rm]!;
  return {
    offset: (form.base + displacement) & 0xffff,
    segment: form.segment,
    displacementBytes,
    sibBytes: 0
  };
}

function decode32(
  reader: InstructionReader,
  offset: number,
  mod: number,
  rm: number,
  registers: RegisterReader
): DecodedMemoryOperand {
  let base = 0;
  let index = 0;
  let segment: DefaultSegment = "ds";
  let sibBytes = 0;
  let displacementOffset = offset + 1;
  let noBase = mod === 0 && rm === 5;

  if (rm === 4) {
    const sib = reader.readCodeByte(displacementOffset) & 0xff;
    const scale = sib >>> 6;
    const indexRegister = (sib >>> 3) & 0x07;
    const baseRegister = sib & 0x07;
    sibBytes = 1;
    displacementOffset += 1;
    noBase = mod === 0 && baseRegister === 5;
    if (!noBase) {
      base = registers.read32(baseRegister);
      if (baseRegister === 4 || baseRegister === 5) segment = "ss";
    }
    if (indexRegister !== 4) index = (registers.read32(indexRegister) << scale) >>> 0;
  } else if (!noBase) {
    base = registers.read32(rm);
    if (rm === 4 || rm === 5) segment = "ss";
  }

  const displacementBytes = mod === 1 ? 1 : mod === 2 || noBase ? 4 : 0;
  return {
    offset:
      (base + index + signedDisplacement(reader, displacementOffset, displacementBytes)) >>> 0,
    segment,
    displacementBytes,
    sibBytes
  };
}

function signedDisplacement(reader: InstructionReader, offset: number, bytes: number): number {
  if (bytes === 0) return 0;
  const byte0 = reader.readCodeByte(offset) & 0xff;
  if (bytes === 1) return (byte0 << 24) >> 24;
  if (bytes === 2) return ((byte0 | ((reader.readCodeByte(offset + 1) & 0xff) << 8)) << 16) >> 16;
  return (
    byte0 |
    ((reader.readCodeByte(offset + 1) & 0xff) << 8) |
    ((reader.readCodeByte(offset + 2) & 0xff) << 16) |
    ((reader.readCodeByte(offset + 3) & 0xff) << 24)
  );
}
