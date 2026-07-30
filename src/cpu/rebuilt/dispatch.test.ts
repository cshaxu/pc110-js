import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "./dispatch.js";
import { RebuiltCpuExecutor } from "./execution.js";
import { RebuiltCpuState } from "./state/cpu-state.js";

describe("rebuilt opcode dispatcher", () => {
  it("executes a mixed instruction sequence without per-step handler selection", () => {
    const state = new RebuiltCpuState();
    state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
    state.writeEip(0);
    const bytes = new Map<number, number>([
      [0, 0xb8],
      [1, 1],
      [2, 0],
      [3, 0x40],
      [4, 0xf9]
    ]);
    const executor = new RebuiltCpuExecutor(state, {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: () => undefined
    });
    executor.step(dispatchRebuiltInstruction);
    executor.step(dispatchRebuiltInstruction);
    executor.step(dispatchRebuiltInstruction);
    expect(state.registers.read16(0)).toBe(2);
    expect(state.flags.has(1)).toBe(true);
    expect(state.readEip()).toBe(5);
  });
});
