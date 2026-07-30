import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_CARRY, EFLAGS_ZERO } from "./arithmetic.js";
import { executeAsciiAdjust } from "./ascii-adjust.js";

function execute(
  bytes: readonly number[],
  setup?: (state: RebuiltCpuState, memory: Map<number, number>) => void
) {
  const state = new RebuiltCpuState();
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
  state.writeEip(0);
  setup?.(state, memory);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(executeAsciiAdjust);
  return state;
}

describe("rebuilt AAM and AAD", () => {
  it("splits AL with AAM and preserves undefined carry", () => {
    const state = execute([0xd4, 10], (cpu) => {
      cpu.registers.write8(0, 42);
      cpu.flags.set(EFLAGS_CARRY);
    });
    expect(state.registers.read8(4)).toBe(4);
    expect(state.registers.read8(0)).toBe(2);
    expect(state.flags.has(EFLAGS_CARRY)).toBe(true);
  });
  it("combines AH and AL with AAD and defines zero", () => {
    const state = execute([0xd5, 10], (cpu) => {
      cpu.registers.write8(4, 2);
      cpu.registers.write8(0, 3);
    });
    expect(state.registers.read8(0)).toBe(23);
    expect(state.registers.read8(4)).toBe(0);
    const zero = execute([0xd5, 10]);
    expect(zero.flags.has(EFLAGS_ZERO)).toBe(true);
  });
  it("delivers #DE for base-zero AAM", () => {
    const state = execute([0xd4, 0], (cpu, memory) => {
      cpu.registers.write16(4, 0x100);
      cpu.writeIdtr({ base: 0x200, limit: 0x3ff });
      [0x34, 0x12, 0, 0x20].forEach((value, index) => memory.set(0x200 + index, value));
    });
    expect(state.snapshot()).toMatchObject({ eip: 0x1234, registers: { esp: 0xfa } });
  });
});
