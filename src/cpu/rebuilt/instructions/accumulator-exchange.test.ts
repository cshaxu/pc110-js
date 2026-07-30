import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_CARRY } from "./arithmetic.js";
import { executeAccumulatorExchange } from "./accumulator-exchange.js";

function execute(bytes: readonly number[], setup?: (state: RebuiltCpuState) => void) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeEip(0);
  setup?.(state);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => bytes[address] ?? 0,
    writeUint8: () => undefined
  }).step(executeAccumulatorExchange);
  return state;
}

describe("rebuilt accumulator XCHG", () => {
  it("exchanges AX with every general register and preserves flags", () => {
    for (let register = 1; register < 8; register += 1) {
      const state = execute([0x90 + register], (cpu) => {
        cpu.registers.write16(0, 0x1000);
        cpu.registers.write16(register, 0x2000 + register);
        cpu.flags.set(EFLAGS_CARRY);
      });
      expect(state.registers.read16(0)).toBe(0x2000 + register);
      expect(state.registers.read16(register)).toBe(0x1000);
      expect(state.flags.has(EFLAGS_CARRY)).toBe(true);
    }
  });

  it("treats 90 as NOP and uses 66 for dword exchange", () => {
    const nop = execute([0x90], (cpu) => cpu.registers.write16(0, 0x1234));
    expect(nop.registers.read16(0)).toBe(0x1234);
    expect(nop.readEip()).toBe(1);
    const wide = execute([0x66, 0x93], (cpu) => {
      cpu.registers.write32(0, 0x1122_3344);
      cpu.registers.write32(3, 0x5566_7788);
    });
    expect(wide.registers.read32(0)).toBe(0x5566_7788);
    expect(wide.registers.read32(3)).toBe(0x1122_3344);
    expect(wide.readEip()).toBe(2);
  });
});
