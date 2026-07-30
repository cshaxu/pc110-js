import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_CARRY, EFLAGS_OVERFLOW, EFLAGS_ZERO } from "./arithmetic.js";
import { executeTestModRm } from "./test.js";

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
  }).step(executeTestModRm);
  return { state, memory };
}

describe("rebuilt TEST ModR/M forms", () => {
  it("tests byte registers without changing either operand", () => {
    const result = execute([0x84, 0xc8], (state) => {
      state.registers.write8(0, 0xf0);
      state.registers.write8(1, 0x0f);
      state.flags.set(EFLAGS_CARRY | EFLAGS_OVERFLOW);
    });
    expect(result.state.registers.read8(0)).toBe(0xf0);
    expect(result.state.registers.read8(1)).toBe(0x0f);
    expect(result.state.flags.has(EFLAGS_ZERO)).toBe(true);
    expect(result.state.flags.has(EFLAGS_CARRY | EFLAGS_OVERFLOW)).toBe(false);
  });

  it("uses 66, 67, and segment override for dword memory TEST", () => {
    const result = execute(
      [0x26, 0x66, 0x67, 0x85, 0x05, 0x00, 0x10, 0x00, 0x00],
      (state, memory) => {
        state.writeSegment("es", {
          selector: 0,
          base: 0x2000,
          limit: 0xffff_ffff,
          default32: false
        });
        state.registers.write32(0, 0x80);
        memory.set(0x3000, 0x80);
      }
    );
    expect(result.state.flags.has(EFLAGS_ZERO)).toBe(false);
    expect(result.state.readEip()).toBe(9);
  });
});
