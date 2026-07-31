import { describe, expect, it } from "vitest";
import { estimate386Cycles } from "./cycle-estimator.js";

describe("80386 cycle estimator", () => {
  it("distinguishes string, I/O, and conditional control timing classes", () => {
    expect(
      estimate386Cycles(
        { opcode: 0xab, prefixes: { bytes: 1, repeat: "rep" }, length: 2 } as never,
        0,
        0
      )
    ).toBe(7);
    expect(
      estimate386Cycles(
        { opcode: 0xab, prefixes: { bytes: 1, repeat: "rep" }, length: 2 } as never,
        0,
        0,
        true,
        true
      )
    ).toBe(3);
    expect(
      estimate386Cycles({ opcode: 0xe4, prefixes: { bytes: 0 }, length: 2 } as never, 0, 2)
    ).toBe(5);
    expect(
      estimate386Cycles({ opcode: 0x75, prefixes: { bytes: 0 }, length: 1 } as never, 0, 2)
    ).toBe(3);
    expect(
      estimate386Cycles({ opcode: 0x75, prefixes: { bytes: 0 }, length: 1 } as never, 0, 8)
    ).toBe(7);
    expect(
      estimate386Cycles({ opcode: 0xe2, prefixes: { bytes: 0 }, length: 1 } as never, 0, 0)
    ).toBe(8);
    expect(
      estimate386Cycles({ opcode: 0xe2, prefixes: { bytes: 0 }, length: 1 } as never, 0, 2)
    ).toBe(4);
  });

  it("does not charge PCjs prefix cycles in the fallback and faults", () => {
    expect(
      estimate386Cycles({ opcode: 0x90, prefixes: { bytes: 2 }, length: 3 } as never, 0, 3)
    ).toBe(3);
    expect(estimate386Cycles(undefined, 0, 0)).toBe(3);
  });

  it("charges the accumulator arithmetic-immediate family as PCjs direct-register paths", () => {
    for (const opcode of [
      0x04, 0x05, 0x0c, 0x0d, 0x14, 0x15, 0x1c, 0x1d, 0x24, 0x25, 0x2c, 0x2d, 0x34, 0x35, 0x3c, 0x3d
    ])
      expect(estimate386Cycles({ opcode, prefixes: { bytes: 0 } } as never, 0, 0)).toBe(3);
  });

  it("classifies valid Group 7 descriptor-table and machine-status forms generically", () => {
    const memory = (reg: number) => ({ raw: reg << 3, mod: 0, reg, rm: 6, memory: true });
    const register = (reg: number) => ({
      raw: 0xc0 | (reg << 3),
      mod: 3,
      reg,
      rm: 0,
      memory: false
    });
    const instruction = (modRm: object) =>
      ({ opcode: 0x0f, secondaryOpcode: 0x01, prefixes: { bytes: 0 }, modRm }) as never;

    expect(estimate386Cycles(instruction(memory(0)), 0, 0)).toBe(11); // SGDT m
    expect(estimate386Cycles(instruction(memory(1)), 0, 0)).toBe(12); // SIDT m
    expect(estimate386Cycles(instruction(memory(2)), 0, 0)).toBe(11); // LGDT m
    expect(estimate386Cycles(instruction(memory(3)), 0, 0)).toBe(12); // LIDT m
    expect(estimate386Cycles(instruction(memory(4)), 0, 0)).toBe(3); // SMSW m
    expect(estimate386Cycles(instruction(register(4)), 0, 0)).toBe(2); // SMSW r
    expect(estimate386Cycles(instruction(memory(6)), 0, 0)).toBe(6); // LMSW m
    expect(estimate386Cycles(instruction(register(6)), 0, 0)).toBe(3); // LMSW r
  });

  it("classifies all valid 80386 control-register moves without a MOD-field rule", () => {
    const modRm = (reg: number) => ({ raw: reg << 3, mod: 0, reg, rm: 0, memory: true });
    const instruction = (secondaryOpcode: number, reg: number) =>
      ({ opcode: 0x0f, secondaryOpcode, prefixes: { bytes: 0 }, modRm: modRm(reg) }) as never;

    for (const reg of [0, 2, 3]) expect(estimate386Cycles(instruction(0x20, reg), 0, 0)).toBe(6);
    expect(estimate386Cycles(instruction(0x22, 0), 0, 0)).toBe(10);
    expect(estimate386Cycles(instruction(0x22, 2), 0, 0)).toBe(4);
    expect(estimate386Cycles(instruction(0x22, 3), 0, 0)).toBe(5);
  });

  it("charges stack, return, exchange, and control-transfer paths explicitly", () => {
    expect(estimate386Cycles({ opcode: 0x53, prefixes: { bytes: 0 } } as never, 0, 0)).toBe(3);
    expect(estimate386Cycles({ opcode: 0x5b, prefixes: { bytes: 0 } } as never, 0, 0)).toBe(5);
    expect(estimate386Cycles({ opcode: 0x86, prefixes: { bytes: 0 } } as never, 0, 0)).toBe(3);
    expect(estimate386Cycles({ opcode: 0xeb, prefixes: { bytes: 0 } } as never, 0, 0)).toBe(7);
    expect(estimate386Cycles({ opcode: 0xea, prefixes: { bytes: 0 } } as never, 0, 0)).toBe(11);
    expect(estimate386Cycles({ opcode: 0x9a, prefixes: { bytes: 0 } } as never, 0, 0)).toBe(13);
    expect(estimate386Cycles({ opcode: 0xcf, prefixes: { bytes: 0 } } as never, 0, 0)).toBe(17);
  });

  it("classifies observed PCjs ModR/M timing forms without address-specific rules", () => {
    const direct = { raw: 0xfb, mod: 3, reg: 7, rm: 3, memory: false };
    const memory = { raw: 0x06, mod: 0, reg: 0, rm: 6, memory: true };
    expect(
      estimate386Cycles({ opcode: 0x80, prefixes: { bytes: 0 }, modRm: direct } as never, 0, 0)
    ).toBe(3);
    expect(
      estimate386Cycles({ opcode: 0x81, prefixes: { bytes: 0 }, modRm: memory } as never, 0, 0)
    ).toBe(7);
    expect(
      estimate386Cycles({ opcode: 0x3a, prefixes: { bytes: 0 }, modRm: memory } as never, 0, 0)
    ).toBe(6);
    expect(
      estimate386Cycles({ opcode: 0x8b, prefixes: { bytes: 0 }, modRm: memory } as never, 0, 0)
    ).toBe(3);
    expect(
      estimate386Cycles({ opcode: 0x8e, prefixes: { bytes: 0 }, modRm: direct } as never, 0, 0)
    ).toBe(2);
    expect(
      estimate386Cycles({ opcode: 0x8e, prefixes: { bytes: 0 }, modRm: memory } as never, 0, 0)
    ).toBe(3);
    expect(
      estimate386Cycles({ opcode: 0xf7, prefixes: { bytes: 0 }, modRm: memory } as never, 0, 0)
    ).toBe(6);
    expect(
      estimate386Cycles(
        { opcode: 0xff, prefixes: { bytes: 0 }, modRm: { ...direct, reg: 4 } } as never,
        0,
        0
      )
    ).toBe(7);
  });
});
