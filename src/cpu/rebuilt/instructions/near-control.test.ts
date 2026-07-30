import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeNearControl } from "./near-control.js";

function execute(
  bytes: readonly number[],
  setup?: (state: RebuiltCpuState, memory: Map<number, number>) => void
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeEip(0);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  setup?.(state, memory);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(executeNearControl);
  return { state, memory };
}

describe("rebuilt near CALL and JMP", () => {
  it("executes near and short JMP relative offsets", () => {
    expect(execute([0xe9, 0x02, 0x00]).state.readEip()).toBe(5);
    expect(execute([0xeb, 0xfc]).state.readEip()).toBe(0xfffe);
  });
  it("pushes fallthrough for CALL with independent 32-bit SS addressing", () => {
    const result = execute([0x66, 0xe8, 0x02, 0x00, 0x00, 0x00], (cpu) => {
      cpu.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff_ffff, default32: true });
      cpu.registers.write32(4, 0x100);
    });
    expect(result.state.readEip()).toBe(8);
    expect(result.state.registers.read32(4)).toBe(0xfc);
    expect(result.memory.get(0xfc)).toBe(6);
  });
});
