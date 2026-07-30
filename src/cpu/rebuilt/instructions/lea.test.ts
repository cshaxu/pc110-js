import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeLea } from "./lea.js";

function execute(bytes: readonly number[], setup?: (state: RebuiltCpuState) => void) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeEip(0);
  setup?.(state);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => bytes[address] ?? 0,
    writeUint8: () => undefined
  }).step(executeLea);
  return state;
}

describe("rebuilt LEA", () => {
  it("writes a 16-bit effective address without reading memory", () => {
    const state = execute([0x8d, 0x40, 0x10], (cpu) => cpu.registers.write16(3, 0xfff8));
    expect(state.registers.read16(0)).toBe(0x0008);
    expect(state.readEip()).toBe(3);
  });

  it("uses 66 and 67 independently for dword destination and SIB effective address", () => {
    const state = execute([0x66, 0x67, 0x8d, 0x04, 0x8d, 0x00, 0x10, 0x00, 0x00], (cpu) =>
      cpu.registers.write32(1, 3)
    );
    expect(state.registers.read32(0)).toBe(0x100c);
    expect(state.readEip()).toBe(9);
  });

  it("rejects a register-only ModR/M encoding", () => {
    expect(() => execute([0x8d, 0xc0])).toThrow("LEA requires a memory addressing form");
  });
});
