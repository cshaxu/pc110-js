import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_CARRY, EFLAGS_OVERFLOW, EFLAGS_ZERO } from "./arithmetic.js";
import { executeAccumulatorTest } from "./accumulator-test.js";

function execute(
  bytes: readonly number[],
  setup?: (state: RebuiltCpuState) => void,
  codeDefault32 = false
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: codeDefault32 });
  state.writeEip(0);
  setup?.(state);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => bytes[address] ?? 0,
    writeUint8: () => undefined
  }).step(executeAccumulatorTest);
  return state;
}

describe("rebuilt accumulator TEST", () => {
  it("tests AL without changing it and updates defined logical flags", () => {
    const state = execute([0xa8, 0x0f], (cpu) => {
      cpu.registers.write8(0, 0xf0);
      cpu.flags.set(EFLAGS_CARRY | EFLAGS_OVERFLOW);
    });
    expect(state.registers.read8(0)).toBe(0xf0);
    expect(state.flags.has(EFLAGS_ZERO)).toBe(true);
    expect(state.flags.has(EFLAGS_CARRY | EFLAGS_OVERFLOW)).toBe(false);
  });

  it("uses 66 for dword immediate TEST", () => {
    const state = execute([0x66, 0xa9, 0x00, 0x00, 0x00, 0x80], (cpu) =>
      cpu.registers.write32(0, 0x8000_0000)
    );
    expect(state.flags.has(EFLAGS_ZERO)).toBe(false);
    expect(state.readEip()).toBe(6);
  });

  it("uses a default-32 immediate and 66 to select its non-default word form", () => {
    const dword = execute(
      [0xa9, 0x00, 0x00, 0x00, 0x80],
      (cpu) => cpu.registers.write32(0, 0x8000_0000),
      true
    );
    expect(dword.flags.has(EFLAGS_ZERO)).toBe(false);
    expect(dword.readEip()).toBe(5);

    const word = execute(
      [0x66, 0xa9, 0x00, 0x80],
      (cpu) => cpu.registers.write32(0, 0x0000_8000),
      true
    );
    expect(word.flags.has(EFLAGS_ZERO)).toBe(false);
    expect(word.readEip()).toBe(4);
  });
});
