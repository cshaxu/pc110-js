import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_CARRY, EFLAGS_OVERFLOW, EFLAGS_ZERO } from "./arithmetic.js";
import { executeShiftRotate } from "./shift-rotate.js";

function execute(
  bytes: readonly number[],
  setup?: (state: RebuiltCpuState, memory: Map<number, number>) => void
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeEip(0);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  setup?.(state, memory);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(executeShiftRotate);
  return { state, memory };
}

describe("rebuilt C0/C1/D0-D3 Group Two", () => {
  it("executes every defined byte operation and rejects /6", () => {
    [0, 1, 2, 3, 4, 5, 7].forEach((extension) => {
      const result = execute([0xd0, 0xc0 | (extension << 3)], (state) => {
        state.registers.write8(0, 0x81);
        state.flags.set(EFLAGS_CARRY);
      });
      expect(result.state.readEip()).toBe(2);
    });
    expect(() => execute([0xd0, 0xf0])).toThrow("#UD");
  });

  it("uses immediate and CL counts, preserves state for zero count, and applies single-count overflow", () => {
    const zero = execute([0xc0, 0xe0, 0x00], (state) => {
      state.registers.write8(0, 0x81);
      state.flags.set(EFLAGS_CARRY | EFLAGS_OVERFLOW);
    });
    expect(zero.state.registers.read8(0)).toBe(0x81);
    expect(zero.state.flags.has(EFLAGS_CARRY | EFLAGS_OVERFLOW)).toBe(true);
    const cl = execute([0xd2, 0xe0], (state) => {
      state.registers.write8(0, 0x40);
      state.registers.write8(1, 1);
    });
    expect(cl.state.registers.read8(0)).toBe(0x80);
    expect(cl.state.flags.has(EFLAGS_OVERFLOW)).toBe(true);
  });

  it("uses 66 and 67 for dword register and memory forms", () => {
    const wide = execute([0x66, 0xc1, 0xe8, 0x01], (state) =>
      state.registers.write32(0, 0x8000_0000)
    );
    expect(wide.state.registers.read32(0)).toBe(0x4000_0000);
    expect(wide.state.flags.has(EFLAGS_OVERFLOW)).toBe(true);
    const memory = execute([0x66, 0x67, 0xc1, 0x25, 0x00, 0x10, 0x00, 0x00, 0x01], (_, bytes) =>
      bytes.set(0x1003, 0x80)
    );
    expect(memory.memory.get(0x1000)).toBe(0);
    expect(memory.state.flags.has(EFLAGS_ZERO)).toBe(true);
  });

  it("maintains carry rings for RCL/RCR and clears overflow for one-bit SAR", () => {
    const rcl = execute([0xd0, 0xd0], (state) => {
      state.registers.write8(0, 0x80);
      state.flags.set(EFLAGS_CARRY);
    });
    expect(rcl.state.registers.read8(0)).toBe(1);
    expect(rcl.state.flags.has(EFLAGS_CARRY)).toBe(true);
    const rcr = execute([0xd0, 0xd8], (state) => {
      state.registers.write8(0, 1);
      state.flags.set(EFLAGS_CARRY);
    });
    expect(rcr.state.registers.read8(0)).toBe(0x80);
    const sar = execute([0xd0, 0xf8], (state) => {
      state.registers.write8(0, 0x80);
      state.flags.set(EFLAGS_OVERFLOW);
    });
    expect(sar.state.registers.read8(0)).toBe(0xc0);
    expect(sar.state.flags.has(EFLAGS_OVERFLOW)).toBe(false);
  });
});
