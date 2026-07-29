export interface ModRm {
  readonly mod: number;
  readonly reg: number;
  readonly rm: number;
  readonly registerDirect: boolean;
}

export type ModRm16Segment = "ds" | "ss";

export interface ModRm16Address {
  readonly offset: number;
  readonly displacementBytes: number;
  readonly segment: ModRm16Segment;
}

export interface ModRm32Address {
  readonly offset: number;
  readonly displacementBytes: number;
  readonly sibBytes: number;
  readonly segment: ModRm16Segment;
}

export class ModRmAddressError extends Error {}

export function decodeModRm(value: number): ModRm {
  const normalized = value & 0xff;
  const mod = normalized >>> 6;
  return {
    mod,
    reg: (normalized >>> 3) & 0x07,
    rm: normalized & 0x07,
    registerDirect: mod === 0x03
  };
}

export function decodeModRm16Address(
  modRm: ModRm,
  readRegister16: (index: number) => number,
  readInstructionByte: (offset: number) => number
): ModRm16Address {
  if (modRm.registerDirect)
    throw new ModRmAddressError("Register-direct ModR/M has no memory address");

  const displacementBytes =
    modRm.mod === 0x01 ? 1 : modRm.mod === 0x02 || modRm.rm === 0x06 ? 2 : 0;
  const displacement = readDisplacement(modRm, displacementBytes, readInstructionByte);
  const { base, segment } = baseAddress(modRm, readRegister16);
  return { offset: (base + displacement) & 0xffff, displacementBytes, segment };
}

export function decodeModRm32Address(
  modRm: ModRm,
  readRegister32: (index: number) => number,
  readInstructionByte: (offset: number) => number
): ModRm32Address {
  if (modRm.registerDirect)
    throw new ModRmAddressError("Register-direct ModR/M has no memory address");

  let base = 0;
  let index = 0;
  let segment: ModRm16Segment = "ds";
  let sibBytes = 0;
  let displacementOffset = 2;
  let noBase = modRm.mod === 0 && modRm.rm === 5;

  if (modRm.rm === 4) {
    const sib = readInstructionByte(2) & 0xff;
    const scale = sib >>> 6;
    const indexRegister = (sib >>> 3) & 0x07;
    const baseRegister = sib & 0x07;
    sibBytes = 1;
    displacementOffset = 3;
    noBase = modRm.mod === 0 && baseRegister === 5;
    if (!noBase) {
      base = readRegister32(baseRegister) >>> 0;
      if (baseRegister === 4 || baseRegister === 5) segment = "ss";
    }
    if (indexRegister !== 4) index = (readRegister32(indexRegister) << scale) >>> 0;
  } else if (!noBase) {
    base = readRegister32(modRm.rm) >>> 0;
    if (modRm.rm === 4 || modRm.rm === 5) segment = "ss";
  }

  const displacementBytes = modRm.mod === 1 ? 1 : modRm.mod === 2 || noBase ? 4 : 0;
  const displacement = readDisplacement32(
    displacementOffset,
    displacementBytes,
    readInstructionByte
  );
  return {
    offset: (base + index + displacement) >>> 0,
    displacementBytes,
    sibBytes,
    segment
  };
}

function readDisplacement(
  modRm: ModRm,
  displacementBytes: number,
  readInstructionByte: (offset: number) => number
): number {
  if (displacementBytes === 0) return 0;
  const low = readInstructionByte(2) & 0xff;
  if (displacementBytes === 1) return (low << 24) >> 24;
  const word = low | ((readInstructionByte(3) & 0xff) << 8);
  return modRm.mod === 0x00 ? word : (word << 16) >> 16;
}

function readDisplacement32(
  offset: number,
  displacementBytes: number,
  readInstructionByte: (offset: number) => number
): number {
  if (displacementBytes === 0) return 0;
  const low = readInstructionByte(offset) & 0xff;
  if (displacementBytes === 1) return (low << 24) >> 24;
  return (
    low |
    ((readInstructionByte(offset + 1) & 0xff) << 8) |
    ((readInstructionByte(offset + 2) & 0xff) << 16) |
    ((readInstructionByte(offset + 3) & 0xff) << 24)
  );
}

function baseAddress(
  modRm: ModRm,
  readRegister16: (index: number) => number
): { base: number; segment: ModRm16Segment } {
  if (modRm.mod === 0x00 && modRm.rm === 0x06) return { base: 0, segment: "ds" };

  const bx = readRegister16(3);
  const bp = readRegister16(5);
  const si = readRegister16(6);
  const di = readRegister16(7);
  switch (modRm.rm) {
    case 0x00:
      return { base: bx + si, segment: "ds" };
    case 0x01:
      return { base: bx + di, segment: "ds" };
    case 0x02:
      return { base: bp + si, segment: "ss" };
    case 0x03:
      return { base: bp + di, segment: "ss" };
    case 0x04:
      return { base: si, segment: "ds" };
    case 0x05:
      return { base: di, segment: "ds" };
    case 0x06:
      return { base: bp, segment: "ss" };
    case 0x07:
      return { base: bx, segment: "ds" };
    default:
      throw new ModRmAddressError("Invalid 16-bit ModR/M address form");
  }
}
