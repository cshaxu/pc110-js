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
import { executeNearConditionalJump } from "./near-conditional-control.js";

function execute(bytes: readonly number[], flags = 0, code32 = false) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: code32 });
  state.writeEip(0);
  state.flags.write(flags);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => bytes[address] ?? 0,
    writeUint8: () => undefined
  }).step(executeNearConditionalJump);
  return state;
}

describe("rebuilt 0F 80-8F near Jcc", () => {
  it("executes every condition selector when its predicate is true", () => {
    const flags = [
      EFLAGS_OVERFLOW,
      0,
      EFLAGS_CARRY,
      0,
      EFLAGS_ZERO,
      0,
      EFLAGS_CARRY,
      0,
      EFLAGS_SIGN,
      0,
      EFLAGS_PARITY,
      0,
      EFLAGS_SIGN,
      0,
      EFLAGS_ZERO,
      0
    ];
    flags.forEach((value, selector) =>
      expect(execute([0x0f, 0x80 + selector, 0x02, 0x00], value).readEip()).toBe(6)
    );
  });
  it("uses default and overridden dword displacements with CS-width EIP", () => {
    expect(execute([0x0f, 0x85, 0xfc, 0xff], 0).readEip()).toBe(0);
    expect(execute([0x66, 0x0f, 0x85, 0x02, 0x00, 0x00, 0x00], 0).readEip()).toBe(9);
    expect(execute([0x0f, 0x85, 0x02, 0x00, 0x00, 0x00], 0, true).readEip()).toBe(8);
  });
});
