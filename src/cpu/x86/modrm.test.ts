import { describe, expect, it } from "vitest";
import { decodeModRm } from "./modrm.js";

describe("80386 ModR/M decoding", () => {
  it("decodes register-direct source and destination fields", () => {
    expect(decodeModRm(0xdb)).toEqual({ mod: 3, reg: 3, rm: 3, registerDirect: true });
  });

  it("identifies memory addressing forms without resolving them", () => {
    expect(decodeModRm(0x18)).toEqual({ mod: 0, reg: 3, rm: 0, registerDirect: false });
  });
});
