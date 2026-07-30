import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "../dispatch.js";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeMoffsMove } from "./moffs-move.js";

function execute(
  bytes: readonly number[],
  setup?: (state: RebuiltCpuState, memory: Map<number, number>) => void,
  codeDefault32 = false
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: codeDefault32 });
  state.writeEip(0);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  setup?.(state, memory);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(executeMoffsMove);
  return { state, memory };
}

describe("rebuilt moffs MOV", () => {
  it("loads and stores byte forms through DS", () => {
    const loaded = execute([0xa0, 0x34, 0x12], (_state, memory) => memory.set(0x1234, 0xa5));
    expect(loaded.state.registers.read8(0)).toBe(0xa5);
    const stored = execute([0xa2, 0x34, 0x12], (state) => state.registers.write8(0, 0x5a));
    expect(stored.memory.get(0x1234)).toBe(0x5a);
  });

  it("uses 66, 67, and segment override for dword moffs forms", () => {
    const loaded = execute([0x26, 0x66, 0x67, 0xa1, 0x00, 0x10, 0x00, 0x00], (state, memory) => {
      state.writeSegment("es", { selector: 0, base: 0x2000, limit: 0xffff_ffff, default32: false });
      memory.set(0x3000, 0x78);
      memory.set(0x3001, 0x56);
      memory.set(0x3002, 0x34);
      memory.set(0x3003, 0x12);
    });
    expect(loaded.state.registers.read32(0)).toBe(0x1234_5678);
    expect(loaded.state.readEip()).toBe(8);
    const stored = execute([0x26, 0x66, 0x67, 0xa3, 0x00, 0x10, 0x00, 0x00], (state) => {
      state.writeSegment("es", { selector: 0, base: 0x2000, limit: 0xffff_ffff, default32: false });
      state.registers.write32(0, 0x1234_5678);
    });
    expect(stored.memory.get(0x3000)).toBe(0x78);
    expect(stored.memory.get(0x3003)).toBe(0x12);
  });

  it("uses default-32 widths and independently overridden word offsets", () => {
    const loaded = execute(
      [0x66, 0x67, 0xa1, 0x34, 0x12],
      (_state, memory) => {
        memory.set(0x1234, 0x78);
        memory.set(0x1235, 0x56);
      },
      true
    );
    expect(loaded.state.registers.read16(0)).toBe(0x5678);
    expect(loaded.state.readEip()).toBe(5);

    const stored = execute(
      [0x66, 0x67, 0xa3, 0x34, 0x12],
      (state) => state.registers.write16(0, 0x1234),
      true
    );
    expect([stored.memory.get(0x1234), stored.memory.get(0x1235)]).toEqual([0x34, 0x12]);
    expect(stored.state.readEip()).toBe(5);
  });

  it("delivers #GP at the faulting EIP when protected DS access is invalid", () => {
    const state = new RebuiltCpuState();
    const memory = new Map<number, number>([
      [0, 0xa0],
      [1, 0],
      [2, 0]
    ]);
    const write = (address: number, values: readonly number[]) =>
      values.forEach((value, index) => memory.set(address + index, value));
    state.writeCr0(1);
    state.writeSegment("cs", { selector: 8, base: 0, limit: 0xffff, default32: false, dpl: 0 });
    state.writeSegment("ds", {
      selector: 0x10,
      base: 0,
      limit: 0xffff,
      default32: false,
      valid: false,
      dpl: 0
    });
    state.writeSegment("ss", {
      selector: 0x18,
      base: 0,
      limit: 0xffff_ffff,
      default32: true,
      dpl: 0
    });
    state.writeGdtr({ base: 0x200, limit: 0x1f });
    state.writeIdtr({ base: 0x300, limit: 0x7f });
    state.writeEip(0);
    state.registers.write32(4, 0x100);
    write(0x208, [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0]);
    write(0x368, [0x40, 0, 8, 0, 0, 0x8e, 0, 0]);
    new RebuiltCpuExecutor(state, {
      readUint8: (address) => memory.get(address) ?? 0,
      writeUint8: (address, value) => memory.set(address, value)
    }).step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({ eip: 0x40, registers: { esp: 0xf0 } });
    expect([0xf0, 0xf4, 0xf8].map((address) => memory.get(address))).toEqual([0, 0, 8]);
  });
});
