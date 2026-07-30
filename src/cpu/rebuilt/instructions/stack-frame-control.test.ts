import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeStackFrameControl } from "./stack-frame-control.js";

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
  }).step(executeStackFrameControl);
  return { state, memory };
}

describe("rebuilt near return and stack-frame control", () => {
  it("pops a near return address and applies C2 stack cleanup", () => {
    const result = execute([0xc2, 0x04, 0x00], {
      setup: (state, memory) => {
        state.registers.write16(4, 0x100);
        memory.set(0x100, 0x34);
        memory.set(0x101, 0x12);
      }
    });
    expect(result.state.readEip()).toBe(0x1234);
    expect(result.state.registers.read16(4)).toBe(0x106);
  });

  it("uses operand width for RET while SS D/B independently selects stack addressing", () => {
    const result = execute([0xc3], {
      code32: true,
      setup: (state, memory) => {
        state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff_ffff, default32: true });
        state.registers.write32(4, 0x1_0000_0100);
        [0x78, 0x56, 0x34, 0x12].forEach((value, index) => memory.set(0x100 + index, value));
      }
    });
    expect(result.state.readEip()).toBe(0x1234_5678);
    expect(result.state.registers.read32(4)).toBe(0x104);
  });

  it("returns through a real-mode far frame and applies RETF cleanup", () => {
    const result = execute([0xca, 0x04, 0x00], {
      setup: (state, memory) => {
        state.registers.write16(4, 0x100);
        [0x34, 0x12, 0x00, 0x20].forEach((value, index) => memory.set(0x100 + index, value));
      }
    });
    expect(result.state.snapshot()).toMatchObject({
      eip: 0x1234,
      segments: { cs: { selector: 0x2000 } },
      registers: { esp: 0x108 }
    });
  });

  it("loads a protected-mode code descriptor on same-privilege RETF", () => {
    const result = execute([0xcb], {
      setup: (state, memory) => {
        state.writeCr0(1);
        state.writeGdtr({ base: 0x20, limit: 0x0f });
        [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0].forEach((value, index) =>
          memory.set(0x28 + index, value)
        );
        state.registers.write16(4, 0x100);
        [0x34, 0x12, 0x08, 0x00].forEach((value, index) => memory.set(0x100 + index, value));
      }
    });
    expect(result.state.snapshot()).toMatchObject({
      eip: 0x1234,
      segments: { cs: { selector: 8, default32: true } }
    });
  });

  it("delivers #GP for an invalid protected RETF selector without consuming the return frame", () => {
    const result = execute([0xcb], {
      stack32: true,
      setup: (state, memory) => {
        state.writeCr0(1);
        state.writeSegment("cs", {
          selector: 0x1b,
          base: 0,
          limit: 0xffff_ffff,
          default32: true,
          dpl: 3
        });
        state.writeSegment("ss", {
          selector: 0x23,
          base: 0,
          limit: 0xffff_ffff,
          default32: true,
          dpl: 3
        });
        state.writeGdtr({ base: 0x200, limit: 0x2f });
        state.writeIdtr({ base: 0x300, limit: 0x7f });
        state.writeTr({ selector: 0x28, base: 0x400, limit: 0x67, default32: true, type: 9 });
        state.registers.write32(4, 0x100);
        [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0].forEach((value, index) =>
          memory.set(0x208 + index, value)
        );
        [0xff, 0xff, 0, 0, 0, 0x92, 0xcf, 0].forEach((value, index) =>
          memory.set(0x210 + index, value)
        );
        [0x80, 0, 8, 0, 0, 0x8e, 0, 0].forEach((value, index) => memory.set(0x368 + index, value));
        [0, 2, 0, 0, 0x10, 0].forEach((value, index) => memory.set(0x404 + index, value));
        [0x34, 0x12, 0, 0].forEach((value, index) => memory.set(0x100 + index, value));
      }
    });
    expect(result.state.snapshot()).toMatchObject({
      eip: 0x80,
      registers: { esp: 0x1e8 },
      segments: { cs: { selector: 8, dpl: 0 }, ss: { selector: 0x10, dpl: 0 } }
    });
    expect([0x1e8, 0x1e9, 0x1ea, 0x1eb].map((address) => result.memory.get(address))).toEqual([
      0, 0, 0, 0
    ]);
  });

  it("creates and tears down an ENTER/LEAVE frame with a nesting level", () => {
    const entered = execute([0xc8, 0x04, 0x00, 0x02], {
      setup: (state, memory) => {
        state.registers.write16(4, 0x100);
        state.registers.write16(5, 0x120);
        memory.set(0x11e, 0xcd);
        memory.set(0x11f, 0xab);
      }
    });
    expect(entered.state.registers.read16(5)).toBe(0xfe);
    expect(entered.state.registers.read16(4)).toBe(0xfa);
    expect(
      [0xfa, 0xfb, 0xfc, 0xfd, 0xfe, 0xff].map((address) => entered.memory.get(address))
    ).toEqual([0xfe, 0x00, 0xcd, 0xab, 0x20, 0x01]);

    const left = execute([0xc9], {
      setup: (state, memory) => {
        state.registers.write16(4, 0x80);
        state.registers.write16(5, 0x100);
        memory.set(0x100, 0x34);
        memory.set(0x101, 0x12);
      }
    });
    expect(left.state.registers.read16(4)).toBe(0x102);
    expect(left.state.registers.read16(5)).toBe(0x1234);
  });

  it("uses SS D/B frame pointers independently from an operand-size override", () => {
    const result = execute([0x66, 0xc8, 0x04, 0x00, 0x00], {
      stack32: true,
      setup: (state) => {
        state.registers.write32(4, 0x200);
        state.registers.write32(5, 0x1234_5678);
      }
    });
    expect(result.state.registers.read32(5)).toBe(0x1fc);
    expect(result.state.registers.read32(4)).toBe(0x1f8);
    expect(result.memory.get(0x1fc)).toBe(0x78);
    expect(result.memory.get(0x1ff)).toBe(0x12);
  });

  it("uses default-32 return data and cleanup for near and far return forms", () => {
    const near = execute([0xc2, 0x04, 0x00], {
      code32: true,
      stack32: true,
      setup: (state, memory) => {
        state.registers.write32(4, 0x100);
        [0x78, 0x56, 0x34, 0x12].forEach((value, index) => memory.set(0x100 + index, value));
      }
    });
    expect(near.state.snapshot()).toMatchObject({ eip: 0x1234_5678, registers: { esp: 0x108 } });

    const far = execute([0xca, 0x04, 0x00], {
      code32: true,
      stack32: true,
      setup: (state, memory) => {
        state.registers.write32(4, 0x100);
        [0x78, 0x56, 0x34, 0x12, 0x00, 0x20, 0, 0].forEach((value, index) =>
          memory.set(0x100 + index, value)
        );
      }
    });
    expect(far.state.snapshot()).toMatchObject({
      eip: 0x1234_5678,
      registers: { esp: 0x10c },
      segments: { cs: { selector: 0x2000, base: 0x20000 } }
    });
  });
});
