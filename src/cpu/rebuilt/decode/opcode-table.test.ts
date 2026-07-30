import { describe, expect, it } from "vitest";
import { extendedOpcodeFamily, primaryOpcodeFamily } from "./opcode-table.js";

describe("rebuilt typed opcode dispatch table", () => {
  it("classifies every implemented primary family through typed metadata", () => {
    expect(primaryOpcodeFamily(0x00)).toBe("first-interval");
    expect(primaryOpcodeFamily(0x6d)).toBe("string-io");
    expect(primaryOpcodeFamily(0xc5)).toBe("load-far-pointer");
    expect(primaryOpcodeFamily(0xd7)).toBe("xlat");
    expect(primaryOpcodeFamily(0xff)).toBe("group-four-five");
  });

  it("separates NXVM undefined and unsupported primary encodings", () => {
    expect(primaryOpcodeFamily(0xd6)).toBe("undefined");
    expect(primaryOpcodeFamily(0xd8)).toBe("undefined");
    expect(primaryOpcodeFamily(0x64)).toBe("unsupported");
  });

  it("classifies 0F dispatch families and preserves NXVM undefined ranges", () => {
    expect(extendedOpcodeFamily(0x00)).toBe("system");
    expect(extendedOpcodeFamily(0x84)).toBe("near-conditional");
    expect(extendedOpcodeFamily(0x94)).toBe("set-condition");
    expect(extendedOpcodeFamily(0xaf)).toBe("extended");
    expect(extendedOpcodeFamily(0xa2)).toBe("undefined");
    expect(extendedOpcodeFamily(0xc0)).toBe("undefined");
  });
});
