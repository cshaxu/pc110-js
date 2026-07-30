import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_CARRY, EFLAGS_OVERFLOW, EFLAGS_ZERO } from "./arithmetic.js";
import { executeGroupThree } from "./group-three.js";

function execute(
  bytes: readonly number[],
  options: {
    readonly code32?: boolean;
    readonly setup?: (state: RebuiltCpuState, memory: Map<number, number>) => void;
  } = {}
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", {
    selector: 0,
    base: 0,
    limit: 0xffff_ffff,
    default32: options.code32 ?? false
  });
  state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeEip(0);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  options.setup?.(state, memory);
  const executor = new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  });
  return { state, memory, step: () => executor.step(executeGroupThree) };
}

describe("rebuilt F6/F7 Group Three", () => {
  it("executes TEST, NOT, and NEG across byte and dword operands", () => {
    const test = execute([0xf6, 0xc0, 0x0f], {
      setup: (state) => state.registers.write8(0, 0xf0)
    });
    test.step();
    expect(test.state.flags.has(EFLAGS_ZERO)).toBe(true);
    expect(test.state.registers.read8(0)).toBe(0xf0);

    const not = execute([0xf7, 0xd0], {
      code32: true,
      setup: (state) => state.registers.write32(0, 0)
    });
    not.step();
    expect(not.state.registers.read32(0)).toBe(0xffff_ffff);

    const neg = execute([0xf6, 0xdb], { setup: (state) => state.registers.write8(3, 1) });
    neg.step();
    expect(neg.state.registers.read8(3)).toBe(0xff);
    expect(neg.state.flags.has(EFLAGS_CARRY)).toBe(true);
  });

  it("executes unsigned and signed multiplication with high-half and overflow results", () => {
    const unsigned = execute([0xf6, 0xe3], {
      setup: (state) => {
        state.registers.write8(0, 0x10);
        state.registers.write8(3, 0x10);
      }
    });
    unsigned.step();
    expect(unsigned.state.registers.read16(0)).toBe(0x100);
    expect(unsigned.state.flags.has(EFLAGS_CARRY | EFLAGS_OVERFLOW)).toBe(true);

    const signed = execute([0x66, 0xf7, 0xe9], {
      setup: (state) => {
        state.registers.write32(0, 3);
        state.registers.write32(1, 0xffff_fffe);
      }
    });
    signed.step();
    expect(signed.state.registers.read32(0)).toBe(0xffff_fffa);
    expect(signed.state.registers.read32(2)).toBe(0xffff_ffff);
    expect(signed.state.flags.has(EFLAGS_CARRY | EFLAGS_OVERFLOW)).toBe(false);
  });

  it("executes unsigned and signed division for byte, word, and dword widths", () => {
    const byte = execute([0xf6, 0xf3], {
      setup: (state) => {
        state.registers.write16(0, 0x0102);
        state.registers.write8(3, 0x10);
      }
    });
    byte.step();
    expect(byte.state.registers.read8(0)).toBe(0x10);
    expect(byte.state.registers.read8(4)).toBe(2);

    const word = execute([0xf7, 0xfb], {
      setup: (state) => {
        state.registers.write16(2, 0);
        state.registers.write16(0, 0x0102);
        state.registers.write16(3, 0x10);
      }
    });
    word.step();
    expect(word.state.registers.read16(0)).toBe(0x10);
    expect(word.state.registers.read16(2)).toBe(2);

    const dword = execute([0x66, 0xf7, 0xf9], {
      setup: (state) => {
        state.registers.write32(2, 0xffff_ffff);
        state.registers.write32(0, 0xffff_fff4);
        state.registers.write32(1, 3);
      }
    });
    dword.step();
    expect(dword.state.registers.read32(0)).toBe(0xffff_fffc);
    expect(dword.state.registers.read32(2)).toBe(0);
  });

  it("uses ModR/M memory with 66 and 67", () => {
    const memory = execute([0x66, 0x67, 0xf7, 0x25, 0x00, 0x10, 0x00, 0x00], {
      setup: (state, bytes) => {
        state.writeSegment("ds", {
          selector: 0,
          base: 0x2000,
          limit: 0xffff_ffff,
          default32: false
        });
        state.registers.write32(0, 4);
        bytes.set(0x3000, 2);
      }
    });
    memory.step();
    expect(memory.state.registers.read32(0)).toBe(8);
  });

  it("delivers #DE and #UD at the faulting EIP instead of leaking host errors", () => {
    for (const bytes of [
      [0xf6, 0xf3],
      [0xf7, 0xf3],
      [0xf6, 0xcb]
    ]) {
      const fault = execute(bytes, {
        setup: (state, memory) => {
          state.writeEip(0x20);
          state.registers.write8(3, 0);
          bytes.forEach((value, index) => memory.set(0x20 + index, value));
          state.registers.write16(4, 0x100);
          const vector = bytes[1] === 0xcb ? 6 : 0;
          memory.set(vector * 4, 0x40);
          memory.set(vector * 4 + 1, 0);
          memory.set(vector * 4 + 2, 0);
          memory.set(vector * 4 + 3, 0);
        }
      });
      fault.step();
      expect(fault.state.snapshot()).toMatchObject({ eip: 0x40, registers: { esp: 0xfa } });
      expect(fault.memory.get(0xfa)).toBe(0x20);
    }
  });
});
