import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_ZERO } from "./arithmetic.js";
import { executeLoop } from "./loop.js";

function execute(
  bytes: readonly number[],
  setup?: (state: RebuiltCpuState) => void,
  codeDefault32 = false
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: codeDefault32 });
  state.writeEip(0);
  setup?.(state);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => bytes[address] ?? 0,
    writeUint8: () => undefined
  }).step(executeLoop);
  return state;
}

describe("rebuilt LOOP family", () => {
  it("decrements CX and applies LOOP/LOOPE/LOOPNE conditions", () => {
    const loop = execute([0xe2, 0x05], (cpu) => cpu.registers.write16(1, 2));
    expect(loop.registers.read16(1)).toBe(1);
    expect(loop.readEip()).toBe(7);
    const loope = execute([0xe1, 0x05], (cpu) => {
      cpu.registers.write16(1, 2);
      cpu.flags.set(EFLAGS_ZERO);
    });
    expect(loope.readEip()).toBe(7);
    const loopne = execute([0xe0, 0x05], (cpu) => {
      cpu.registers.write16(1, 2);
      cpu.flags.set(EFLAGS_ZERO);
    });
    expect(loopne.readEip()).toBe(2);
  });
  it("uses 67 ECX and leaves it unchanged for JCXZ", () => {
    const loop = execute([0x67, 0xe2, 0xfe], (cpu) => cpu.registers.write32(1, 2));
    expect(loop.registers.read32(1)).toBe(1);
    expect(loop.readEip()).toBe(1);
    const jcxz = execute([0xe3, 0x05]);
    expect(jcxz.readEip()).toBe(7);
    expect(jcxz.registers.read16(1)).toBe(0);
  });

  it("uses ECX and a dword code offset by default in 32-bit code", () => {
    const loop = execute([0xe2, 0xfe], (cpu) => cpu.registers.write32(1, 2), true);
    expect(loop.registers.read32(1)).toBe(1);
    expect(loop.readEip()).toBe(0);
    const jecxz = execute([0xe3, 0x05], undefined, true);
    expect(jecxz.readEip()).toBe(7);
  });
});
