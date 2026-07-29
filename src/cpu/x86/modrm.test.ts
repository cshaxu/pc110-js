import { describe, expect, it } from "vitest";
import { decodeModRm, decodeModRm16Address, ModRmAddressError } from "./modrm.js";

describe("80386 ModR/M decoding", () => {
  it("decodes register-direct source and destination fields", () => {
    expect(decodeModRm(0xdb)).toEqual({ mod: 3, reg: 3, rm: 3, registerDirect: true });
  });

  it("identifies memory addressing forms without resolving them", () => {
    expect(decodeModRm(0x18)).toEqual({ mod: 0, reg: 3, rm: 0, registerDirect: false });
  });

  it("decodes direct, indexed, and BP-based 16-bit memory addresses", () => {
    const registers = [0, 0, 0, 0x1000, 0, 0x2000, 0x0030, 0x0040];
    const readRegister16 = (index: number) => registers[index] ?? 0;

    expect(
      decodeModRm16Address(
        decodeModRm(0x06),
        readRegister16,
        (offset) => [0, 0, 0x34, 0x12][offset] ?? 0
      )
    ).toEqual({ offset: 0x1234, displacementBytes: 2, segment: "ds" });
    expect(
      decodeModRm16Address(decodeModRm(0x40), readRegister16, (offset) => [0, 0, 0xf0][offset] ?? 0)
    ).toEqual({ offset: 0x1020, displacementBytes: 1, segment: "ds" });
    expect(
      decodeModRm16Address(decodeModRm(0x46), readRegister16, (offset) => [0, 0, 0x10][offset] ?? 0)
    ).toEqual({ offset: 0x2010, displacementBytes: 1, segment: "ss" });
  });

  it("rejects a register-direct form when a memory address is required", () => {
    expect(() =>
      decodeModRm16Address(
        decodeModRm(0xc0),
        () => 0,
        () => 0
      )
    ).toThrow(ModRmAddressError);
  });
});
