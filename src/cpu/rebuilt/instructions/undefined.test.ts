import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "../dispatch.js";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";

describe("rebuilt undefined opcodes", () => {
  it.each([0xd6, 0xd8, 0xd9, 0xda, 0xdb, 0xdc, 0xdd, 0xde, 0xdf, 0xf1])(
    "delivers #UD for 0x%02x with the faulting real-mode EIP",
    (opcode) => {
      const state = new RebuiltCpuState();
      state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
      state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false });
      state.writeEip(0);
      state.registers.write16(4, 0x100);
      const memory = new Map<number, number>([
        [0, opcode],
        [0x18, 0x34],
        [0x19, 0x12],
        [0x1a, 0x00],
        [0x1b, 0x20]
      ]);
      new RebuiltCpuExecutor(state, {
        readUint8: (address) => memory.get(address) ?? 0,
        writeUint8: (address, value) => memory.set(address, value)
      }).step(dispatchRebuiltInstruction);
      expect(state.snapshot()).toMatchObject({
        eip: 0x1234,
        registers: { esp: 0xfa },
        segments: { cs: { selector: 0x2000 } }
      });
      expect(memory.get(0xfa)).toBe(0);
    }
  );

  it.each([
    ["primary 82", [0x82]],
    ["extended 0F B8", [0x0f, 0xb8]],
    ["extended 0F B9", [0x0f, 0xb9]]
  ])("delivers #UD for NXVM-defined %s", (_, bytes) => {
    const state = new RebuiltCpuState();
    state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false });
    state.writeEip(0);
    state.registers.write16(4, 0x100);
    const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
    [0x34, 0x12, 0x00, 0x20].forEach((value, index) => memory.set(0x18 + index, value));

    new RebuiltCpuExecutor(state, {
      readUint8: (address) => memory.get(address) ?? 0,
      writeUint8: (address, value) => memory.set(address, value)
    }).step(dispatchRebuiltInstruction);

    expect(state.snapshot()).toMatchObject({ eip: 0x1234, registers: { esp: 0xfa } });
    expect(memory.get(0xfa)).toBe(0);
  });
});
