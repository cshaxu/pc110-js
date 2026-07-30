import { describe, expect, it } from "vitest";
import { RegisterFile } from "./register-file.js";

describe("RegisterFile", () => {
  it("keeps 8-bit, 16-bit, and 32-bit aliases coherent", () => {
    const registers = new RegisterFile();
    registers.write32(0, 0x12345678);
    registers.write8(4, 0xab);
    registers.write16(0, 0xcdef);

    expect(registers.read32(0)).toBe(0x1234cdef);
    expect(registers.read8(4)).toBe(0xcdef >>> 8);
  });
});
