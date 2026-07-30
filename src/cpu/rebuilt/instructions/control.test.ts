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
import { executeShortConditionalJump } from "./control.js";

function execute(
  bytes: readonly number[],
  options: { readonly code32?: boolean; readonly eip?: number; readonly flags?: number } = {}
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", {
    selector: 0,
    base: 0,
    limit: 0xffff_ffff,
    default32: options.code32 ?? false
  });
  state.writeEip(options.eip ?? 0);
  state.flags.write(options.flags ?? 0);
  const memory = new Map<number, number>(
    bytes.map((value, index) => [(options.eip ?? 0) + index, value])
  );
  const executor = new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: () => undefined
  });
  executor.step(executeShortConditionalJump);
  return state;
}

describe("rebuilt 70-7F short conditional jumps", () => {
  it("executes every condition selector when its required EFLAGS predicate is true", () => {
    const trueFlags = [
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
    trueFlags.forEach((flags, selector) => {
      expect(execute([0x70 + selector, 0x05], { flags }).readEip()).toBe(7);
    });
  });

  it("keeps every condition selector at fallthrough when its predicate is false", () => {
    const falseFlags = [
      0,
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
      EFLAGS_ZERO | EFLAGS_SIGN
    ];
    falseFlags.forEach((flags, selector) => {
      expect(execute([0x70 + selector, 0x05], { flags }).readEip()).toBe(2);
    });
  });

  it("uses signed rel8 displacement and wraps EIP according to the CS default", () => {
    expect(execute([0x75, 0xfc], { flags: 0, eip: 4 }).readEip()).toBe(2);
    expect(execute([0x75, 0x02], { flags: 0, eip: 0xfffe }).readEip()).toBe(2);
    expect(execute([0x75, 0x02], { code32: true, flags: 0, eip: 0xffff_fffe }).readEip()).toBe(2);
  });

  it("counts 66 in the instruction length without changing rel8 condition semantics", () => {
    expect(execute([0x66, 0x74, 0xfe], { flags: EFLAGS_ZERO }).readEip()).toBe(1);
  });
});
