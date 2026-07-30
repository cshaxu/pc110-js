import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_CARRY } from "./arithmetic.js";
import { executeSignExtension } from "./sign-extension.js";

function execute(bytes: readonly number[], setup?: (state: RebuiltCpuState) => void) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeEip(0);
  setup?.(state);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => bytes[address] ?? 0,
    writeUint8: () => undefined
  }).step(executeSignExtension);
  return state;
}

describe("rebuilt CBW/CWDE and CWD/CDQ", () => {
  it("sign-extends AL to AX and AX to DX", () => {
    const cbw = execute([0x98], (cpu) => cpu.registers.write8(0, 0x80));
    expect(cbw.registers.read16(0)).toBe(0xff80);
    const cwd = execute([0x99], (cpu) => cpu.registers.write16(0, 0x8000));
    expect(cwd.registers.read16(2)).toBe(0xffff);
  });

  it("uses 66 for CWDE and CDQ while preserving flags", () => {
    const cwde = execute([0x66, 0x98], (cpu) => {
      cpu.registers.write16(0, 0x8000);
      cpu.flags.set(EFLAGS_CARRY);
    });
    expect(cwde.registers.read32(0)).toBe(0xffff_8000);
    expect(cwde.flags.has(EFLAGS_CARRY)).toBe(true);
    const cdq = execute([0x66, 0x99], (cpu) => cpu.registers.write32(0, 0x8000_0000));
    expect(cdq.registers.read32(2)).toBe(0xffff_ffff);
  });
});
