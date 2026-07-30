import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeArpl } from "./arpl.js";

function execute(
  bytes: readonly number[],
  protectedMode: boolean,
  setup?: (state: RebuiltCpuState, memory: Map<number, number>) => void
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeEip(0);
  state.writeCr0(protectedMode ? 1 : 0);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  setup?.(state, memory);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(executeArpl);
  return { state, memory };
}

describe("rebuilt ARPL", () => {
  it("raises RPL and ZF for register and 67-selected memory destinations", () => {
    const register = execute([0x63, 0xc8], true, (state) => {
      state.registers.write16(0, 0x1000);
      state.registers.write16(1, 3);
    });
    expect(register.state.snapshot()).toMatchObject({
      registers: { eax: 0x1003 },
      eip: 2,
      eflags: 0x42
    });
    const memory = execute([0x67, 0x63, 0x0d, 0x20, 0, 0, 0], true, (state, values) => {
      state.registers.write16(1, 2);
      values.set(0x20, 0);
      values.set(0x21, 0x20);
    });
    expect([memory.memory.get(0x20), memory.memory.get(0x21)]).toEqual([2, 0x20]);
  });
  it("clears ZF when no adjustment is required and raises #UD in real mode", () => {
    const unchanged = execute([0x63, 0xc8], true, (state) => {
      state.registers.write16(0, 3);
      state.registers.write16(1, 1);
      state.flags.set(0x40);
    });
    expect(unchanged.state.flags.has(0x40)).toBe(false);
    const real = execute([0x63, 0xc8], false, (state, memory) => {
      state.registers.write16(4, 0x100);
      [0x34, 0x12, 0, 0x20].forEach((value, index) => memory.set(0x18 + index, value));
    });
    expect(real.state.snapshot()).toMatchObject({ eip: 0x1234, registers: { esp: 0xfa } });
  });
});
