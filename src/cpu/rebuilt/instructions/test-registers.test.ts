import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "../dispatch.js";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";

function run(bytes: number[], setup?: (state: RebuiltCpuState) => void) {
  const state = new RebuiltCpuState();
  for (const segment of ["cs", "ds", "es", "ss", "fs", "gs"] as const)
    state.writeSegment(segment, { selector: 0, base: 0, limit: 0xffffffff, default32: false });
  state.writeEip(0);
  setup?.(state);
  const memory = new Map(bytes.map((value, index) => [index, value]));
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(dispatchRebuiltInstruction);
  return { state, memory };
}

describe("rebuilt 0F test-register transfers", () => {
  it("moves TR6 and TR7 in both fixed-width directions", () => {
    expect(
      run([0x0f, 0x24, 0xf0], (state) => state.writeTest(6, 0xabcdef01)).state.registers.read32(0)
    ).toBe(0xabcdef01);
    expect(
      run([0x0f, 0x26, 0xf8], (state) => state.registers.write32(0, 0x11223344)).state.readTest(7)
    ).toBe(0x11223344);
  });

  it("does not let operand-size prefixes narrow test-register transfers", () => {
    const result = run([0x66, 0x0f, 0x24, 0xf0], (state) => state.writeTest(6, 0x12345678));
    expect(result.state.registers.read32(0)).toBe(0x12345678);
    expect(result.state.readEip()).toBe(4);
  });

  it("delivers #UD for non-TR6/TR7 and memory forms", () => {
    for (const modRm of [0xe0, 0x30]) {
      const bytes = new Array<number>(0x1c).fill(0);
      bytes[0] = 0x0f;
      bytes[1] = 0x24;
      bytes[2] = modRm;
      bytes[0x18] = 0x34;
      const result = run(bytes);
      expect(result.state.readEip()).toBe(0x34);
    }
  });
});
