import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_CARRY, EFLAGS_OVERFLOW, EFLAGS_ZERO } from "./arithmetic.js";
import { executeRegisterStackInterval } from "./register-stack.js";

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
  executor.step(executeRegisterStackInterval);
  return { state, memory };
}

describe("rebuilt 40-5F register and stack forms", () => {
  it("executes every INC and DEC register opcode with 16-bit operands and preserves CF", () => {
    for (let register = 0; register < 8; register += 1) {
      const increment = execute([0x40 + register], {
        setup: (state) => {
          state.registers.write16(register, 0xffff);
          state.flags.set(EFLAGS_CARRY);
        }
      });
      expect(increment.state.registers.read16(register)).toBe(0);
      expect(increment.state.flags.has(EFLAGS_CARRY | EFLAGS_ZERO)).toBe(true);
      expect(increment.state.readEip()).toBe(1);

      const decrement = execute([0x48 + register], {
        setup: (state) => {
          state.registers.write16(register, 0);
          state.flags.set(EFLAGS_CARRY);
        }
      });
      expect(decrement.state.registers.read16(register)).toBe(0xffff);
      expect(decrement.state.flags.has(EFLAGS_CARRY)).toBe(true);
    }
  });

  it("uses the CS default and 66 override to select 16-bit or 32-bit INC and DEC", () => {
    const default32 = execute([0x40], {
      code32: true,
      setup: (state) => state.registers.write32(0, 0x7fff_ffff)
    });
    expect(default32.state.registers.read32(0)).toBe(0x8000_0000);
    expect(default32.state.flags.has(EFLAGS_OVERFLOW)).toBe(true);

    const override32 = execute([0x66, 0x48], {
      setup: (state) => state.registers.write32(0, 0)
    });
    expect(override32.state.registers.read32(0)).toBe(0xffff_ffff);
    expect(override32.state.readEip()).toBe(2);

    const override16 = execute([0x66, 0x4f], {
      code32: true,
      setup: (state) => state.registers.write32(7, 0x1234_0000)
    });
    expect(override16.state.registers.read32(7)).toBe(0x1234_ffff);
  });

  it("executes every PUSH and POP register opcode with operand data width separate from SS address width", () => {
    for (let register = 0; register < 8; register += 1) {
      const expected = register === 4 ? 0x1_0002 : 0x1122_3300 + register;
      const pushed = execute([0x50 + register], {
        code32: true,
        stack32: true,
        setup: (state) => {
          state.registers.write32(register, expected);
          state.registers.write32(4, 0x1_0002);
        }
      });
      expect(pushed.state.registers.read32(4)).toBe(0xfffe);
      expect(pushed.memory.get(0xfffe)).toBe(expected & 0xff);
      expect(pushed.memory.get(0xffff)).toBe((expected >>> 8) & 0xff);

      const popped = execute([0x58 + register], {
        code32: true,
        stack32: true,
        setup: (state) => state.registers.write32(4, 0x1_0000),
        setupMemory: (memory) => {
          memory.set(0x1_0000, expected & 0xff);
          memory.set(0x1_0001, (expected >>> 8) & 0xff);
          memory.set(0x1_0002, (expected >>> 16) & 0xff);
          memory.set(0x1_0003, expected >>> 24);
        }
      });
      expect(popped.state.registers.read32(register)).toBe(expected);
    }
  });

  it("uses 66 PUSH and POP data width with an independent 16-bit SS stack address", () => {
    const pushed = execute([0x66, 0x50], {
      setup: (state) => {
        state.registers.write32(0, 0xaabb_ccdd);
        state.registers.write32(4, 0x1234_0002);
      }
    });
    expect(pushed.state.registers.read32(4)).toBe(0x1234_fffe);
    expect(pushed.memory.get(0xfffe)).toBe(0xdd);
    expect(pushed.memory.get(0x0001)).toBe(0xaa);

    const popped = execute([0x66, 0x58], {
      codeOffset: 0x2000,
      setup: (state) => state.registers.write32(4, 0x1234_fffe),
      setupMemory: (memory) => {
        memory.set(0xfffe, 0x78);
        memory.set(0xffff, 0x56);
        memory.set(0x0000, 0x34);
        memory.set(0x0001, 0x12);
      }
    });
    expect(popped.state.registers.read32(0)).toBe(0x1234_5678);
    expect(popped.state.registers.read32(4)).toBe(0x1234_0002);
  });

  it("uses the original stack pointer for PUSH ESP and replaces it for POP ESP", () => {
    const pushed = execute([0x54], {
      code32: true,
      stack32: true,
      setup: (state) => state.registers.write32(4, 0x2000)
    });
    expect(pushed.state.registers.read32(4)).toBe(0x1ffc);
    expect(pushed.memory.get(0x1ffc)).toBe(0x00);
    expect(pushed.memory.get(0x1ffd)).toBe(0x20);

    const popped = execute([0x5c], {
      code32: true,
      stack32: true,
      setup: (state) => state.registers.write32(4, 0x1ffc),
      setupMemory: (memory) => {
        memory.set(0x1ffc, 0x78);
        memory.set(0x1ffd, 0x56);
        memory.set(0x1ffe, 0x34);
        memory.set(0x1fff, 0x12);
      }
    });
    expect(popped.state.registers.read32(4)).toBe(0x1234_5678);
  });
});
