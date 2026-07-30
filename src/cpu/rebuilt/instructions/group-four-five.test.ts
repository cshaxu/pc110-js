import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_CARRY } from "./arithmetic.js";
import { executeGroupFourFive } from "./group-four-five.js";

function execute(
  bytes: readonly number[],
  options: {
    readonly code32?: boolean;
    readonly stack32?: boolean;
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
  state.writeSegment("ss", {
    selector: 0,
    base: 0,
    limit: 0xffff_ffff,
    default32: options.stack32 ?? false
  });
  state.writeEip(0);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  options.setup?.(state, memory);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(executeGroupFourFive);
  return { state, memory };
}

describe("rebuilt FE/FF Group Four/Five", () => {
  it("executes FE INC/DEC with carry preservation and memory addressing", () => {
    const increment = execute([0xfe, 0xc0], {
      setup: (state) => {
        state.registers.write8(0, 0xff);
        state.flags.set(EFLAGS_CARRY);
      }
    });
    expect(increment.state.registers.read8(0)).toBe(0);
    expect(increment.state.flags.has(EFLAGS_CARRY)).toBe(true);
    const decrement = execute([0x67, 0xfe, 0x0d, 0x00, 0x10, 0x00, 0x00], {
      setup: (_, memory) => memory.set(0x1000, 0)
    });
    expect(decrement.memory.get(0x1000)).toBe(0xff);
  });

  it("executes FF INC/DEC at the operand width", () => {
    const result = execute([0x66, 0xff, 0xc8], { setup: (state) => state.registers.write32(0, 0) });
    expect(result.state.registers.read32(0)).toBe(0xffff_ffff);
  });

  it("executes FF near CALL/JMP with operand-width targets and return frames", () => {
    const call = execute([0x66, 0xff, 0xd0], {
      stack32: true,
      setup: (state) => {
        state.registers.write32(0, 0x1234_5678);
        state.registers.write32(4, 0x100);
      }
    });
    expect(call.state.readEip()).toBe(0x5678);
    expect(call.state.registers.read32(4)).toBe(0xfc);
    expect(call.memory.get(0xfc)).toBe(3);
    const jump = execute([0xff, 0xe0], { setup: (state) => state.registers.write16(0, 0x3456) });
    expect(jump.state.readEip()).toBe(0x3456);
  });

  it("pushes FF /6 through the independent SS stack boundary", () => {
    const result = execute([0x66, 0xff, 0xf0], {
      stack32: true,
      setup: (state) => {
        state.registers.write32(0, 0xaabb_ccdd);
        state.registers.write32(4, 0x100);
      }
    });
    expect(result.state.registers.read32(4)).toBe(0xfc);
    expect(result.memory.get(0xfc)).toBe(0xdd);
    expect(result.memory.get(0xff)).toBe(0xaa);
  });

  it("executes FF far CALL and JMP through memory pointers", () => {
    const call = execute([0xff, 0x1e, 0x20, 0x00], {
      setup: (state, memory) => {
        memory.set(0x20, 0x34);
        memory.set(0x21, 0x12);
        memory.set(0x22, 0x00);
        memory.set(0x23, 0x20);
        state.registers.write16(4, 0x100);
      }
    });
    expect(call.state.snapshot()).toMatchObject({
      eip: 0x1234,
      segments: { cs: { selector: 0x2000 } },
      registers: { esp: 0xfc }
    });
    const jump = execute([0xff, 0x2e, 0x20, 0x00], {
      setup: (_, memory) => {
        memory.set(0x20, 0x78);
        memory.set(0x21, 0x56);
        memory.set(0x22, 0x00);
        memory.set(0x23, 0x30);
      }
    });
    expect(jump.state.snapshot()).toMatchObject({
      eip: 0x5678,
      segments: { cs: { selector: 0x3000 } }
    });
  });
});
