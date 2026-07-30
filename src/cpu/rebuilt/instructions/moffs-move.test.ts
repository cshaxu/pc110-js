import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeMoffsMove } from "./moffs-move.js";

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
  }).step(executeMoffsMove);
  return { state, memory };
}

describe("rebuilt moffs MOV", () => {
  it("loads and stores byte forms through DS", () => {
    const loaded = execute([0xa0, 0x34, 0x12], (_state, memory) => memory.set(0x1234, 0xa5));
    expect(loaded.state.registers.read8(0)).toBe(0xa5);
    const stored = execute([0xa2, 0x34, 0x12], (state) => state.registers.write8(0, 0x5a));
    expect(stored.memory.get(0x1234)).toBe(0x5a);
  });

  it("uses 66, 67, and segment override for dword moffs forms", () => {
    const loaded = execute([0x26, 0x66, 0x67, 0xa1, 0x00, 0x10, 0x00, 0x00], (state, memory) => {
      state.writeSegment("es", { selector: 0, base: 0x2000, limit: 0xffff_ffff, default32: false });
      memory.set(0x3000, 0x78);
      memory.set(0x3001, 0x56);
      memory.set(0x3002, 0x34);
      memory.set(0x3003, 0x12);
    });
    expect(loaded.state.registers.read32(0)).toBe(0x1234_5678);
    expect(loaded.state.readEip()).toBe(8);
    const stored = execute([0x26, 0x66, 0x67, 0xa3, 0x00, 0x10, 0x00, 0x00], (state) => {
      state.writeSegment("es", { selector: 0, base: 0x2000, limit: 0xffff_ffff, default32: false });
      state.registers.write32(0, 0x1234_5678);
    });
    expect(stored.memory.get(0x3000)).toBe(0x78);
    expect(stored.memory.get(0x3003)).toBe(0x12);
  });
});
