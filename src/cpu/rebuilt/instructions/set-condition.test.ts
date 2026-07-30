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
import { executeSetCondition } from "./set-condition.js";

function execute(
  bytes: readonly number[],
  flags: number,
  setup?: (state: RebuiltCpuState, memory: Map<number, number>) => void,
  code32 = false
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: code32 });
  state.writeEip(0);
  state.flags.write(flags);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  setup?.(state, memory);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(executeSetCondition);
  return { state, memory };
}

describe("rebuilt 0F 90-9F SETcc", () => {
  it("writes one for every true condition selector without changing EFLAGS", () => {
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
    flags.forEach((value, selector) => {
      const result = execute([0x0f, 0x90 + selector, 0xc0], value);
      expect(result.state.registers.read8(0)).toBe(1);
      expect(result.state.flags.read()).toBe((value | 2) >>> 0);
      expect(result.state.readEip()).toBe(3);
    });
  });
  it("writes zero for false conditions and supports overridden memory destinations", () => {
    expect(execute([0x0f, 0x94, 0xc0], 0).state.registers.read8(0)).toBe(0);
    const result = execute([0x26, 0x67, 0x0f, 0x95, 0x05, 0, 0x10, 0, 0], 0, (state) =>
      state.writeSegment("es", { selector: 0, base: 0x2000, limit: 0xffff_ffff, default32: false })
    );
    expect(result.memory.get(0x3000)).toBe(1);
    expect(result.state.readEip()).toBe(9);
  });

  it("uses default-32 addressing without changing the byte result width", () => {
    const result = execute(
      [0x0f, 0x95, 0x05, 0x00, 0x10, 0x00, 0x00],
      0,
      (state) =>
        state.writeSegment("ds", {
          selector: 0,
          base: 0x2000,
          limit: 0xffff_ffff,
          default32: false
        }),
      true
    );
    expect(result.memory.get(0x3000)).toBe(1);
    expect(result.state.readEip()).toBe(7);
  });
});
