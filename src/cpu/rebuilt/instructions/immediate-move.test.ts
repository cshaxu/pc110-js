import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeImmediateMove } from "./immediate-move.js";

function execute(
  bytes: readonly number[],
  codeDefault32 = false,
  setup?: (state: RebuiltCpuState) => void
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: codeDefault32 });
  state.writeEip(0);
  setup?.(state);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => bytes[address] ?? 0,
    writeUint8: () => undefined
  }).step(executeImmediateMove);
  return state;
}

describe("rebuilt immediate register MOV", () => {
  it("executes every B0-B7 byte register encoding", () => {
    for (let register = 0; register < 8; register += 1) {
      const state = execute([0xb0 + register, 0x80 + register]);
      expect(state.registers.read8(register)).toBe(0x80 + register);
      expect(state.readEip()).toBe(2);
    }
  });

  it("executes every B8-BF word register encoding", () => {
    for (let register = 0; register < 8; register += 1) {
      const state = execute([0xb8 + register, register, 0xa5]);
      expect(state.registers.read16(register)).toBe(0xa500 + register);
      expect(state.readEip()).toBe(3);
    }
  });

  it("uses 66 to load dword immediate values", () => {
    const state = execute([0x66, 0xbd, 0x78, 0x56, 0x34, 0x12]);
    expect(state.registers.read32(5)).toBe(0x1234_5678);
    expect(state.readEip()).toBe(6);
  });

  it("executes every default-32 B8-BF form and preserves upper halves with 66", () => {
    for (let register = 0; register < 8; register += 1) {
      const dword = execute([0xb8 + register, 0x78, 0x56, 0x34, 0x12], true);
      expect(dword.registers.read32(register)).toBe(0x1234_5678);
      expect(dword.readEip()).toBe(5);

      const word = execute([0x66, 0xb8 + register, 0xcd, 0xab], true, (state) =>
        state.registers.write32(register, 0x1234_0000)
      );
      expect(word.registers.read32(register)).toBe(0x1234_abcd);
      expect(word.readEip()).toBe(4);
    }
  });
});
