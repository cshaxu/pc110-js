import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_CARRY, EFLAGS_OVERFLOW } from "./arithmetic.js";
import { executeFrameImmediateSlice } from "./frame-immediate.js";

function execute(
  bytes: readonly number[],
  options: {
    readonly code32?: boolean;
    readonly stack32?: boolean;
    readonly codeOffset?: number;
    readonly setup?: (state: RebuiltCpuState) => void;
    readonly setupMemory?: (memory: Map<number, number>) => void;
  } = {}
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", {
    selector: 0,
    base: 0,
    limit: 0xffff_ffff,
    default32: options.code32 ?? false
  });
  state.writeSegment("ss", {
    selector: 0,
    base: 0,
    limit: 0xffff_ffff,
    default32: options.stack32 ?? false
  });
  const codeOffset = options.codeOffset ?? 0;
  state.writeEip(codeOffset);
  options.setup?.(state);
  const memory = new Map<number, number>(bytes.map((value, index) => [codeOffset + index, value]));
  options.setupMemory?.(memory);
  const executor = new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  });
  executor.step(executeFrameImmediateSlice);
  return { state, memory };
}

describe("rebuilt 60-6B frame and immediate forms", () => {
  it("executes BOUND across signed operand widths and delivers #BR/#UD failures", () => {
    const inside = execute([0x62, 0x06, 0x20, 0], {
      setup: (state) => state.registers.write16(0, 3),
      setupMemory: (memory) =>
        [0, 0, 5, 0].forEach((value, index) => memory.set(0x20 + index, value))
    });
    expect(inside.state.readEip()).toBe(4);
    const outside = execute([0x62, 0x06, 0x20, 0], {
      setup: (state) => {
        state.registers.write16(0, 6);
        state.registers.write16(4, 0x100);
      },
      setupMemory: (memory) => {
        [0, 0, 5, 0].forEach((value, index) => memory.set(0x20 + index, value));
        [0x34, 0x12, 0, 0x20].forEach((value, index) => memory.set(0x14 + index, value));
      }
    });
    expect(outside.state.snapshot()).toMatchObject({ eip: 0x1234, registers: { esp: 0xfa } });
    const invalid = execute([0x62, 0xc0], {
      setup: (state) => state.registers.write16(4, 0x100),
      setupMemory: (memory) =>
        [0x34, 0x12, 0, 0x20].forEach((value, index) => memory.set(0x18 + index, value))
    });
    expect(invalid.state.snapshot()).toMatchObject({ eip: 0x1234, registers: { esp: 0xfa } });
  });
  it("pushes every 16-bit register plus the original SP in PUSHA order", () => {
    const result = execute([0x60], {
      setup: (state) => {
        for (let register = 0; register < 8; register += 1)
          state.registers.write16(register, 0x1000 + register);
        state.registers.write16(4, 0x100);
      }
    });
    expect(result.state.registers.read16(4)).toBe(0xf0);
    expect(
      [0xf0, 0xf2, 0xf4, 0xf6, 0xf8, 0xfa, 0xfc, 0xfe].map((address) => result.memory.get(address))
    ).toEqual([0x07, 0x06, 0x05, 0x00, 0x03, 0x02, 0x01, 0x00]);
  });

  it("pops all registers while discarding the POPA stack-pointer slot", () => {
    const result = execute([0x61], {
      code32: true,
      stack32: true,
      setup: (state) => state.registers.write32(4, 0x100),
      setupMemory: (memory) => {
        const values = [
          0x0000_0007, 0x0000_0006, 0x0000_0005, 0xfeed_beef, 0x0000_0003, 0x0000_0002, 0x0000_0001,
          0x0000_0000
        ];
        values.forEach((value, index) => {
          for (let byte = 0; byte < 4; byte += 1)
            memory.set(0x100 + index * 4 + byte, value >>> (byte * 8));
        });
      }
    });
    expect(result.state.registers.snapshot()).toMatchObject({
      eax: 0,
      ecx: 1,
      edx: 2,
      ebx: 3,
      ebp: 5,
      esi: 6,
      edi: 7,
      esp: 0x120
    });
  });

  it("uses operand size for PUSH imm and sign-extends PUSH imm8 independently of SS D/B", () => {
    const wide = execute([0x66, 0x68, 0xdd, 0xcc, 0xbb, 0xaa], {
      setup: (state) => state.registers.write32(4, 0x1234_0002)
    });
    expect(wide.state.registers.read32(4)).toBe(0x1234_fffe);
    expect(wide.memory.get(0xfffe)).toBe(0xdd);
    expect(wide.memory.get(0x0001)).toBe(0xaa);

    const signedByte = execute([0x6a, 0x80], {
      code32: true,
      stack32: true,
      setup: (state) => state.registers.write32(4, 0x100)
    });
    expect(signedByte.state.registers.read32(4)).toBe(0xfc);
    expect(signedByte.memory.get(0xfc)).toBe(0x80);
    expect(signedByte.memory.get(0xff)).toBe(0xff);
  });

  it("implements 69 and 6B signed IMUL register forms with CF and OF truncation signaling", () => {
    const precise = execute([0x6b, 0xc1, 0xfe], {
      code32: true,
      setup: (state) => state.registers.write32(1, 3)
    });
    expect(precise.state.registers.read32(0)).toBe(0xffff_fffa);
    expect(precise.state.flags.has(EFLAGS_CARRY | EFLAGS_OVERFLOW)).toBe(false);

    const overflow = execute([0x69, 0xc1, 0x00, 0x00, 0x00, 0x40], {
      code32: true,
      setup: (state) => state.registers.write32(1, 4)
    });
    expect(overflow.state.registers.read32(0)).toBe(0);
    expect(overflow.state.flags.has(EFLAGS_CARRY | EFLAGS_OVERFLOW)).toBe(true);
  });

  it("uses 66, 67, and a segment override for dword IMUL memory operands", () => {
    const result = execute(
      [0x26, 0x66, 0x67, 0x69, 0x05, 0x00, 0x10, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00],
      {
        setup: (state) =>
          state.writeSegment("es", {
            selector: 0,
            base: 0x2000,
            limit: 0xffff_ffff,
            default32: false
          }),
        setupMemory: (memory) => memory.set(0x3000, 3)
      }
    );
    expect(result.state.registers.read32(0)).toBe(6);
    expect(result.state.readEip()).toBe(13);
  });
});
