import { describe, expect, it } from "vitest";
import { estimate386Cycles } from "./cycle-estimator.js";

const snapshot = (eip: number) => ({ eip }) as never;

describe("80386 cycle estimator", () => {
  it("distinguishes string, I/O, and conditional control timing classes", () => {
    expect(
      estimate386Cycles(
        { opcode: 0xab, prefixes: { bytes: 1 }, length: 2 } as never,
        snapshot(0),
        snapshot(0)
      )
    ).toBe(5);
    expect(
      estimate386Cycles(
        { opcode: 0xe4, prefixes: { bytes: 0 }, length: 2 } as never,
        snapshot(0),
        snapshot(2)
      )
    ).toBe(12);
    expect(
      estimate386Cycles(
        { opcode: 0x75, prefixes: { bytes: 0 }, length: 2 } as never,
        snapshot(0),
        snapshot(2)
      )
    ).toBe(3);
    expect(
      estimate386Cycles(
        { opcode: 0x75, prefixes: { bytes: 0 }, length: 2 } as never,
        snapshot(0),
        snapshot(8)
      )
    ).toBe(7);
  });

  it("accounts for prefixes in the fallback and faults", () => {
    expect(
      estimate386Cycles(
        { opcode: 0x90, prefixes: { bytes: 2 }, length: 3 } as never,
        snapshot(0),
        snapshot(3)
      )
    ).toBe(4);
    expect(estimate386Cycles(undefined, snapshot(0), snapshot(0))).toBe(3);
  });
});
