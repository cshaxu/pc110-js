import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "../dispatch.js";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";

function run(bytes: number[], setup: (state: RebuiltCpuState) => void) {
  const state = new RebuiltCpuState();
  for (const segment of ["cs", "ds", "es", "ss", "fs", "gs"] as const)
    state.writeSegment(segment, { selector: 0, base: 0, limit: 0xffffffff, default32: false });
  state.writeEip(0);
  setup(state);
  new RebuiltCpuExecutor(state, {
    readUint8: (a) => bytes[a] ?? 0,
    writeUint8: () => undefined
  }).step(dispatchRebuiltInstruction);
  return state;
}

describe("rebuilt 0F control and debug transfers", () => {
  it("moves CR2 and CR3 in both directions", () => {
    expect(run([0x0f, 0x20, 0xd0], (s) => s.writeCr2(0x12345678)).registers.read32(0)).toBe(
      0x12345678
    );
    expect(run([0x0f, 0x22, 0xd8], (s) => s.registers.write32(0, 0x12345fff)).readCr3()).toBe(
      0x12345000
    );
  });
  it("moves defined debug registers in both directions", () => {
    expect(run([0x0f, 0x21, 0xf0], (s) => s.writeDebug(6, 0xabcdef01)).registers.read32(0)).toBe(
      0xabcdef01
    );
    expect(run([0x0f, 0x23, 0xf8], (s) => s.registers.write32(0, 0x11223344)).readDebug(7)).toBe(
      0x11223344
    );
  });
});
