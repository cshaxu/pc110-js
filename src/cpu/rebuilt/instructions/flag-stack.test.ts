import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeFlagStack } from "./flag-stack.js";

function execute(
  bytes: readonly number[],
  setup: (state: RebuiltCpuState, memory: Map<number, number>) => void
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeEip(0);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  setup(state, memory);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(executeFlagStack);
  return { state, memory };
}

describe("rebuilt PUSHF and POPF", () => {
  it("pushes operand-size selected flags and strips VM/RF from PUSHFD", () => {
    const result = execute([0x66, 0x9c], (state) => {
      state.registers.write16(4, 0x100);
      state.flags.write(0x0003_0303);
    });
    expect(result.state.registers.read16(4)).toBe(0xfc);
    expect(result.memory.get(0xfc)).toBe(0x03);
    expect(result.memory.get(0xff)).toBe(0);
  });
  it("preserves protected nonzero-CPL IOPL on POPFD", () => {
    const result = execute([0x66, 0x9d], (state, memory) => {
      state.writeCr0(1);
      state.writeSegment("cs", { selector: 3, base: 0, limit: 0xffff_ffff, default32: false });
      state.registers.write16(4, 0x100);
      state.flags.write(0x3002);
      [0xff, 0xff, 0xff, 0xff].forEach((value, index) => memory.set(0x100 + index, value));
    });
    expect(result.state.flags.read() & 0x3000).toBe(0x3000);
  });
});
