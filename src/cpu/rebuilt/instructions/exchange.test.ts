import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_CARRY } from "./arithmetic.js";
import { executeExchangeModRm } from "./exchange.js";

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
  }).step(executeExchangeModRm);
  return { state, memory };
}

describe("rebuilt XCHG ModR/M forms", () => {
  it("exchanges byte registers without altering flags", () => {
    const result = execute([0x86, 0xc8], (state) => {
      state.registers.write8(0, 0x12);
      state.registers.write8(1, 0x34);
      state.flags.set(EFLAGS_CARRY);
    });
    expect(result.state.registers.read8(0)).toBe(0x34);
    expect(result.state.registers.read8(1)).toBe(0x12);
    expect(result.state.flags.has(EFLAGS_CARRY)).toBe(true);
  });

  it("uses 66, 67, and a segment override for dword memory exchange", () => {
    const result = execute(
      [0x26, 0x66, 0x67, 0x87, 0x05, 0x00, 0x10, 0x00, 0x00],
      (state, memory) => {
        state.writeSegment("es", {
          selector: 0,
          base: 0x2000,
          limit: 0xffff_ffff,
          default32: false
        });
        state.registers.write32(0, 0x1122_3344);
        memory.set(0x3000, 0x88);
        memory.set(0x3001, 0x77);
        memory.set(0x3002, 0x66);
        memory.set(0x3003, 0x55);
      }
    );
    expect(result.state.registers.read32(0)).toBe(0x5566_7788);
    expect(result.memory.get(0x3000)).toBe(0x44);
    expect(result.memory.get(0x3003)).toBe(0x11);
  });
});
