import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeFlagStack } from "./flag-stack.js";

function execute(
  bytes: readonly number[],
  setup: (state: RebuiltCpuState, memory: Map<number, number>) => void
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeEip(0);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  setup(state, memory);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(executeFlagStack);
  return { state, memory };
}

describe("rebuilt PUSHF and POPF", () => {
  it("pushes operand-size selected flags and strips VM/RF from PUSHFD", () => {
    const result = execute([0x66, 0x9c], (state) => {
      state.registers.write16(4, 0x100);
      state.flags.write(0x0003_0303);
    });
    expect(result.state.registers.read16(4)).toBe(0xfc);
    expect(result.memory.get(0xfc)).toBe(0x03);
    expect(result.memory.get(0xff)).toBe(0);
  });
  it("preserves protected nonzero-CPL IOPL on POPFD", () => {
    const result = execute([0x66, 0x9d], (state, memory) => {
      state.writeCr0(1);
      state.writeSegment("cs", { selector: 3, base: 0, limit: 0xffff_ffff, default32: false });
      state.registers.write16(4, 0x100);
      state.flags.write(0x3002);
      [0xff, 0xff, 0xff, 0xff].forEach((value, index) => memory.set(0x100 + index, value));
    });
    expect(result.state.flags.read() & 0x3000).toBe(0x3000);
  });

  it("allows virtual-8086 PUSHF and POPF only with IOPL three", () => {
    const pushed = execute([0x9c], (state) => {
      state.writeCr0(1);
      state.flags.write(0x0002_3002);
      state.registers.write32(4, 0x100);
    });
    expect(pushed.memory.get(0xfe)).toBe(0x02);
    expect(pushed.memory.get(0xff)).toBe(0x30);

    const popped = execute([0x9d], (state, memory) => {
      state.writeCr0(1);
      state.flags.write(0x0002_3002);
      state.registers.write32(4, 0x100);
      memory.set(0x100, 0x43);
      memory.set(0x101, 0x30);
    });
    expect(popped.state.flags.read() & 0x0002_30ff).toBe(0x0002_3043);
  });

  it("delivers #GP through the rebuilt v86 TSS frame when IOPL is below three", () => {
    const result = execute([0x9c], (state, memory) => {
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
  });
});
