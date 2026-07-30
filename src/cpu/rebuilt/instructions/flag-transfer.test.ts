import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import {
  EFLAGS_CARRY,
  EFLAGS_OVERFLOW,
  EFLAGS_PARITY,
  EFLAGS_SIGN,
  EFLAGS_ZERO
} from "./arithmetic.js";
import { executeFlagTransfer } from "./flag-transfer.js";

function execute(byte: number, setup?: (state: RebuiltCpuState) => void) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
  state.writeEip(0);
  setup?.(state);
  new RebuiltCpuExecutor(state, { readUint8: () => byte, writeUint8: () => undefined }).step(
    executeFlagTransfer
  );
  return state;
}

describe("rebuilt SAHF and LAHF", () => {
  it("loads selected flags from AH without overwriting unrelated EFLAGS", () => {
    const state = execute(0x9e, (cpu) => {
      cpu.registers.write8(4, EFLAGS_CARRY | EFLAGS_PARITY | EFLAGS_SIGN);
      cpu.flags.set(EFLAGS_OVERFLOW | EFLAGS_ZERO);
    });
    expect(state.flags.has(EFLAGS_CARRY | EFLAGS_PARITY | EFLAGS_SIGN | EFLAGS_OVERFLOW)).toBe(
      true
    );
    expect(state.flags.has(EFLAGS_ZERO)).toBe(false);
  });

  it("stores selected flags in AH without changing the flags", () => {
    const state = execute(0x9f, (cpu) =>
      cpu.flags.set(EFLAGS_CARRY | EFLAGS_PARITY | EFLAGS_ZERO | EFLAGS_OVERFLOW)
    );
    expect(state.registers.read8(4)).toBe(EFLAGS_CARRY | EFLAGS_PARITY | EFLAGS_ZERO | 0x02);
    expect(state.flags.has(EFLAGS_OVERFLOW)).toBe(true);
  });
});
