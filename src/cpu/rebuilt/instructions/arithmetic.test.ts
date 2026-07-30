import { describe, expect, it } from "vitest";
import {
  add,
  EFLAGS_AUXILIARY_CARRY,
  EFLAGS_CARRY,
  EFLAGS_OVERFLOW,
  EFLAGS_PARITY,
  EFLAGS_SIGN,
  EFLAGS_ZERO,
  logical,
  subtract
} from "./arithmetic.js";

describe("rebuilt arithmetic semantics", () => {
  it("calculates ADD and ADC flags at byte, word, and dword boundaries", () => {
    expect(add(0, 0x7f, 1, 8)).toMatchObject({
      value: 0x80,
      flags: EFLAGS_AUXILIARY_CARRY | EFLAGS_OVERFLOW | EFLAGS_SIGN
    });
    expect(add(0, 0xffff, 0, 16, 1)).toMatchObject({
      value: 0,
      flags: EFLAGS_CARRY | EFLAGS_AUXILIARY_CARRY | EFLAGS_PARITY | EFLAGS_ZERO
    });
    expect(add(0, 0xffffffff, 1, 32)).toMatchObject({
      value: 0,
      flags: EFLAGS_CARRY | EFLAGS_AUXILIARY_CARRY | EFLAGS_PARITY | EFLAGS_ZERO
    });
  });

  it("calculates SUB, SBB, and CMP-compatible flags without requiring writeback", () => {
    expect(subtract(0, 0, 1, 8)).toMatchObject({
      value: 0xff,
      flags: EFLAGS_CARRY | EFLAGS_AUXILIARY_CARRY | EFLAGS_PARITY | EFLAGS_SIGN
    });
    expect(subtract(0, 0x8000, 1, 16)).toMatchObject({
      value: 0x7fff,
      flags: EFLAGS_AUXILIARY_CARRY | EFLAGS_OVERFLOW | EFLAGS_PARITY
    });
    expect(subtract(EFLAGS_CARRY, 1, 0, 32, 1)).toMatchObject({
      value: 0,
      flags: EFLAGS_PARITY | EFLAGS_ZERO
    });
  });

  it("clears CF and OF for logical results while preserving undefined AF", () => {
    expect(logical(EFLAGS_CARRY | EFLAGS_OVERFLOW | EFLAGS_AUXILIARY_CARRY, 0, 16)).toEqual({
      value: 0,
      flags: EFLAGS_AUXILIARY_CARRY | EFLAGS_PARITY | EFLAGS_ZERO
    });
  });
});
