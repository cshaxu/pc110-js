import { describe, expect, it } from "vitest";
import { SegmentRegister } from "./segment-register.js";

describe("SegmentRegister", () => {
  it("loads real-mode and virtual-8086 segment bases", () => {
    const register = new SegmentRegister();
    expect(register.load("real", 0x1234, "read", 0)).toMatchObject({
      base: 0x12340,
      limit: 0xffff
    });
    expect(register.load("virtual-8086", 0xf000, "execute", 3)).toMatchObject({ base: 0xf0000 });
  });

  it("loads a checked protected-mode descriptor into the cache", () => {
    const values = new Map<number, number>([
      [0x1008, 0x0000ffff],
      [0x100c, 0x00cf9a00]
    ]);
    const memory = { readUint32: (address: number) => values.get(address) ?? 0 };
    const register = new SegmentRegister();

    expect(
      register.load("protected", 0x08, "execute", 0, memory, { base: 0x1000, limit: 0x17 })
    ).toMatchObject({
      selector: 8,
      base: 0,
      limit: 0xffffffff,
      descriptor: { type: 0x0a, present: true }
    });
  });
});
