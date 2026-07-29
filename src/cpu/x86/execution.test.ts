import { describe, expect, it } from "vitest";
import { fetchOpcode } from "./execution.js";
import { Cpu386State } from "./state.js";

describe("80386 instruction fetch", () => {
  it("fetches the reset-vector opcode through the current CS:EIP state", () => {
    const values = new Map<number, number>([[0x000ffff0, 0xea]]);
    const memory = { readUint8: (address: number) => values.get(address) ?? 0 };

    expect(fetchOpcode(memory, new Cpu386State())).toEqual({
      linearAddress: 0x000ffff0,
      instructionPointer: 0x0000fff0,
      opcode: 0xea
    });
  });
});
