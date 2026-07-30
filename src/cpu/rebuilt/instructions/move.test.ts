import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeMoveModRm } from "./move.js";

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
  }).step(executeMoveModRm);
  return { state, memory };
}

describe("rebuilt MOV ModR/M forms", () => {
  it("moves both byte directions between registers", () => {
    const stored = execute([0x88, 0xc8], (state) => {
      state.registers.write8(1, 0x7a);
      state.registers.write8(0, 0);
    });
    expect(stored.state.registers.read8(0)).toBe(0x7a);
    const loaded = execute([0x8a, 0xc8], (state) => {
      state.registers.write8(0, 0x6b);
      state.registers.write8(1, 0);
    });
    expect(loaded.state.registers.read8(1)).toBe(0x6b);
  });

  it("moves dword memory in both directions with 66, 67, and segment override", () => {
    const stored = execute([0x26, 0x66, 0x67, 0x89, 0x05, 0x00, 0x10, 0x00, 0x00], (state) => {
      state.writeSegment("es", { selector: 0, base: 0x2000, limit: 0xffff_ffff, default32: false });
      state.registers.write32(0, 0x1122_3344);
    });
    expect(stored.memory.get(0x3000)).toBe(0x44);
    const loaded = execute(
      [0x26, 0x66, 0x67, 0x8b, 0x05, 0x00, 0x10, 0x00, 0x00],
      (state, memory) => {
        state.writeSegment("es", {
          selector: 0,
          base: 0x2000,
          limit: 0xffff_ffff,
          default32: false
        });
        memory.set(0x3000, 0x44);
        memory.set(0x3001, 0x33);
        memory.set(0x3002, 0x22);
        memory.set(0x3003, 0x11);
      }
    );
    expect(loaded.state.registers.read32(0)).toBe(0x1122_3344);
  });
});
