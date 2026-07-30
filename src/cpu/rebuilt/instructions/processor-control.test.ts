import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "../dispatch.js";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";

function execute(
  opcode: number,
  setup?: (state: RebuiltCpuState, memory: Map<number, number>) => void
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: true, dpl: 0 });
  state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff_ffff, default32: true, dpl: 0 });
  state.writeEip(0);
  const memory = new Map<number, number>([[0, opcode]]);
  setup?.(state, memory);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(dispatchRebuiltInstruction);
  return { state, memory };
}

describe("rebuilt HLT, CLI, and STI", () => {
  it("halts after advancing EIP", () => {
    const result = execute(0xf4);
    expect(result.state.snapshot()).toMatchObject({ eip: 1, halted: true });
  });

  it("changes IF for real mode and authorized protected mode", () => {
    expect(execute(0xfa, (state) => state.flags.set(0x200)).state.flags.read() & 0x200).toBe(0);
    const protectedResult = execute(0xfb, (state) => {
      state.writeCr0(1);
      state.flags.write(0x3002);
    });
    expect(protectedResult.state.flags.read() & 0x200).toBe(0x200);
  });

  it("delivers #GP(0) for protected HLT and CLI when CPL exceeds IOPL", () => {
    for (const opcode of [0xf4, 0xfa]) {
      const result = execute(opcode, (state, memory) => {
        state.writeCr0(1);
        state.writeSegment("cs", {
          selector: 0x0b,
          base: 0,
          limit: 0xffff_ffff,
          default32: true,
          dpl: 3
        });
        state.writeGdtr({ base: 0x200, limit: 0x1f });
        state.writeIdtr({ base: 0x300, limit: 0x7f });
        state.registers.write32(4, 0x100);
        memory.set(0x208, 0xff);
        memory.set(0x209, 0xff);
        memory.set(0x21d, 0xfa);
        memory.set(0x21e, 0xcf);
        [0x80, 0, 0x1b, 0, 0, 0x8e, 0, 0].forEach((value, index) =>
          memory.set(0x368 + index, value)
        );
      });
      expect(result.state.snapshot()).toMatchObject({ eip: 0x80, registers: { esp: 0xf0 } });
      expect(result.memory.get(0xf0)).toBe(0);
      expect(result.memory.get(0xf4)).toBe(0);
    }
  });

  it("uses virtual-8086 CPL three for CLI and STI IOPL admission", () => {
    const cli = execute(0xfa, (state) => {
      state.writeCr0(1);
      state.flags.write(0x0002_3202);
      state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false, dpl: 3 });
    });
    expect(cli.state.flags.read() & 0x200).toBe(0);
    const sti = execute(0xfb, (state) => {
      state.writeCr0(1);
      state.flags.write(0x0002_3002);
      state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false, dpl: 3 });
    });
    expect(sti.state.flags.read() & 0x200).toBe(0x200);
  });

  it("delivers virtual-8086 CLI and STI IOPL denials through the TSS frame", () => {
    for (const opcode of [0xfa, 0xfb]) {
      const result = execute(opcode, (state, memory) => {
        state.writeCr0(1);
        state.flags.write(0x0002_0002);
        state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false, dpl: 3 });
        state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false, dpl: 3 });
        state.writeGdtr({ base: 0x200, limit: 0x1f });
        state.writeIdtr({ base: 0x300, limit: 0x7f });
        state.writeTr({ selector: 0x18, base: 0x400, limit: 0x67, default32: true, type: 9 });
        state.registers.write32(4, 0x100);
        [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0].forEach((value, index) =>
          memory.set(0x208 + index, value)
        );
        [0xff, 0xff, 0, 0, 0, 0x92, 0xcf, 0].forEach((value, index) =>
          memory.set(0x210 + index, value)
        );
        [0x80, 0, 8, 0, 0, 0x8e, 0, 0].forEach((value, index) => memory.set(0x368 + index, value));
        [0, 2, 0, 0, 0x10, 0].forEach((value, index) => memory.set(0x404 + index, value));
      });
      expect(result.state.snapshot()).toMatchObject({ eip: 0x80, registers: { esp: 0x1d8 } });
      expect(result.state.flags.read() & 0x00020000).toBe(0);
    }
  });
});
