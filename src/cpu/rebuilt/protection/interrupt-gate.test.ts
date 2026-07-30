import { describe, expect, it } from "vitest";
import { readInterruptGate } from "./interrupt-gate.js";

describe("rebuilt interrupt gate lookup", () => {
  it("decodes 16-bit and 32-bit interrupt and trap gates", () => {
    const bytes = new Uint8Array(0x200);
    bytes.set([0x78, 0x56, 8, 0, 0, 0x8e, 0x34, 0x12], 0x100);
    bytes.set([0x34, 0x12, 0x10, 0, 0, 0xe7, 0, 0], 0x108);
    const memory = { readUint8: (address: number) => bytes[address]!, writeUint8: () => undefined };
    expect(readInterruptGate(memory, { base: 0x100, limit: 0x0f }, 0)).toMatchObject({
      selector: 8,
      offset: 0x12345678,
      operandSize: 32,
      trap: false
    });
    expect(readInterruptGate(memory, { base: 0x100, limit: 0x0f }, 1)).toMatchObject({
      selector: 0x10,
      offset: 0x1234,
      operandSize: 16,
      trap: true,
      dpl: 3
    });
  });
});
