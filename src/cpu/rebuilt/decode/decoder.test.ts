import { describe, expect, it } from "vitest";
import { decodeInstruction, InstructionLengthError } from "./decoder.js";

function reader(bytes: readonly number[]) {
  return { readCodeByte: (offset: number) => bytes[offset] ?? 0x90 };
}

describe("decodeInstruction", () => {
  it("derives both defaults from CS D/B and keeps the fault EIP at instruction start", () => {
    const decoded = decodeInstruction(reader([0x2e, 0x66, 0x67, 0x90]), 0x00123456, true);

    expect(decoded).toMatchObject({
      startEip: 0x00123456,
      opcodeOffset: 3,
      opcode: 0x90,
      length: 4,
      prefixes: { operandSize: 16, addressSize: 16, segmentOverride: "cs" }
    });
  });

  it("uses the last segment and repeat prefix without cumulatively toggling size", () => {
    const decoded = decodeInstruction(reader([0x26, 0x64, 0xf2, 0xf3, 0x66, 0x66, 0x90]), 0, false);

    expect(decoded.prefixes).toMatchObject({
      segmentOverride: "fs",
      repeat: "rep",
      operandSize: 32,
      addressSize: 16
    });
  });

  it("retains ModR/M shape only for timing-sensitive decoded forms", () => {
    expect(decodeInstruction(reader([0x2e, 0x3a, 0x06]), 0, false).modRm).toEqual({
      raw: 0x06,
      mod: 0,
      reg: 0,
      rm: 6,
      memory: true
    });
    expect(decodeInstruction(reader([0x8e, 0xd8]), 0, false).modRm).toEqual({
      raw: 0xd8,
      mod: 3,
      reg: 3,
      rm: 0,
      memory: false
    });
    expect(decodeInstruction(reader([0x8e, 0x47, 0x06]), 0, false).modRm).toEqual({
      raw: 0x47,
      mod: 1,
      reg: 0,
      rm: 7,
      memory: true
    });
    expect(decodeInstruction(reader([0xb0, 0x01]), 0, false).modRm).toBeUndefined();
  });

  it("accepts a fifteen-byte instruction and rejects fifteen prefixes", () => {
    expect(decodeInstruction(reader([...Array(14).fill(0x66), 0x90]), 0x10, false)).toMatchObject({
      length: 15,
      opcode: 0x90
    });

    expect(() => decodeInstruction(reader(Array(15).fill(0x66)), 0x00100020, false)).toThrow(
      new InstructionLengthError(0x00100020)
    );
  });
});
