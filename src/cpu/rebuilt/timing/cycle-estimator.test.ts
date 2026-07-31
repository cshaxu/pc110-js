import { describe, expect, it } from "vitest";
import { estimate386Cycles } from "./cycle-estimator.js";

describe("80386 cycle estimator", () => {
  it("distinguishes string, I/O, and conditional control timing classes", () => {
    expect(
      estimate386Cycles({ opcode: 0xab, prefixes: { bytes: 1 }, length: 2 } as never, 0, 0)
    ).toBe(5);
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

  it("charges stack, return, exchange, and control-transfer paths explicitly", () => {
    expect(estimate386Cycles({ opcode: 0x53, prefixes: { bytes: 0 } } as never, 0, 0)).toBe(3);
    expect(estimate386Cycles({ opcode: 0x5b, prefixes: { bytes: 0 } } as never, 0, 0)).toBe(5);
    expect(estimate386Cycles({ opcode: 0x86, prefixes: { bytes: 0 } } as never, 0, 0)).toBe(3);
    expect(estimate386Cycles({ opcode: 0xeb, prefixes: { bytes: 0 } } as never, 0, 0)).toBe(7);
    expect(estimate386Cycles({ opcode: 0xea, prefixes: { bytes: 0 } } as never, 0, 0)).toBe(11);
    expect(estimate386Cycles({ opcode: 0x9a, prefixes: { bytes: 0 } } as never, 0, 0)).toBe(13);
    expect(estimate386Cycles({ opcode: 0xcf, prefixes: { bytes: 0 } } as never, 0, 0)).toBe(17);
  });
});
