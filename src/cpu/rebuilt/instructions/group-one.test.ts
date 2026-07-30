import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_CARRY, EFLAGS_ZERO } from "./arithmetic.js";
import { executeGroupOne } from "./group-one.js";

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
  }).step(executeGroupOne);
  return { state, memory };
}

describe("rebuilt Group One immediate arithmetic", () => {
  it("executes every 80 /n byte operation and preserves CMP destination", () => {
    const expected = [2, 1, 4, 0xff, 1, 0, 0, 1];
    expected.forEach((value, extension) => {
      const result = execute([0x80, 0xc0 | (extension << 3), 0x01], (state) => {
        state.registers.write8(0, extension === 2 ? 2 : 1);
        if (extension === 2 || extension === 3) state.flags.set(EFLAGS_CARRY);
      });
      expect(result.state.registers.read8(0)).toBe(value);
    });
  });

  it("uses 81 operand width and 83 sign extension", () => {
    const wide = execute([0x66, 0x81, 0xc0, 0x01, 0x00, 0x00, 0x00], (state) =>
      state.registers.write32(0, 1)
    );
    expect(wide.state.registers.read32(0)).toBe(2);
    const signed = execute([0x66, 0x83, 0xe8, 0xff], (state) => state.registers.write32(0, 1));
    expect(signed.state.registers.read32(0)).toBe(2);
  });

  it("uses 67 and a segment override for memory destinations", () => {
    const result = execute(
      [0x26, 0x66, 0x67, 0x83, 0x05, 0x00, 0x10, 0x00, 0x00, 0xff],
      (state, memory) => {
        state.writeSegment("es", {
          selector: 0,
          base: 0x2000,
          limit: 0xffff_ffff,
          default32: false
        });
        memory.set(0x3000, 1);
      }
    );
    expect(result.memory.get(0x3000)).toBe(0);
    expect(result.state.flags.has(EFLAGS_ZERO)).toBe(true);
  });
});
