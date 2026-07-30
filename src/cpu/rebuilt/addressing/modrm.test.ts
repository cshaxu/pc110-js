import { describe, expect, it } from "vitest";
import { decodeModRm } from "./modrm.js";

function reader(bytes: readonly number[]) {
  return { readCodeByte: (offset: number) => bytes[offset] ?? 0 };
}

const registers = {
  read16: (index: number) => [0, 0, 0, 0x1000, 0, 0x2000, 0x0030, 0x0040][index] ?? 0,
  read32: (index: number) =>
    [0x1000, 0x2000, 0x3000, 0x4000, 0x5000, 0x6000, 0x7000, 0x8000][index] ?? 0
};

describe("rebuilt 80386 ModR/M decoder", () => {
  it("keeps register-direct operands separate from effective addresses", () => {
    expect(decodeModRm(reader([0xc7]), 0, 16, registers)).toEqual({
      mod: 3,
      reg: 0,
      rm: 7,
      registerDirect: true,
      bytes: 1
    });
  });

  it("resolves all 16-bit special displacement and BP segment rules", () => {
    expect(decodeModRm(reader([0x06, 0x34, 0x12]), 0, 16, registers).memory).toEqual({
      offset: 0x1234,
      segment: "ds",
      displacementBytes: 2,
      sibBytes: 0
    });
    expect(decodeModRm(reader([0x46, 0xf0]), 0, 16, registers).memory).toEqual({
      offset: 0x1ff0,
      segment: "ss",
      displacementBytes: 1,
      sibBytes: 0
    });
  });

  it("resolves 32-bit direct, SIB, scale, and default segment selection", () => {
    expect(decodeModRm(reader([0x05, 0x78, 0x56, 0x34, 0x12]), 0, 32, registers).memory).toEqual({
      offset: 0x12345678,
      segment: "ds",
      displacementBytes: 4,
      sibBytes: 0
    });
    expect(decodeModRm(reader([0x44, 0x24, 0xf0]), 0, 32, registers).memory).toEqual({
      offset: 0x4ff0,
      segment: "ss",
      displacementBytes: 1,
      sibBytes: 1
    });
    expect(decodeModRm(reader([0x04, 0x95, 0x20, 0, 0, 0]), 0, 32, registers).memory).toEqual({
      offset: 0xc020,
      segment: "ds",
      displacementBytes: 4,
      sibBytes: 1
    });
  });
});
