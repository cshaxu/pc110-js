import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "../dispatch.js";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";

function executor(state: RebuiltCpuState, memory: Map<number, number>): RebuiltCpuExecutor {
  return new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  });
}

function write(memory: Map<number, number>, address: number, bytes: readonly number[]): void {
  bytes.forEach((value, index) => memory.set(address + index, value));
}

function realModeState(): RebuiltCpuState {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
  state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false });
  state.writeEip(0);
  state.registers.write16(4, 0x100);
  return state;
}

describe("rebuilt INT and IRET", () => {
  it("delivers a real-mode INT through the IVT and creates a 16-bit frame", () => {
    const state = realModeState();
    state.flags.set(0x300);
    const memory = new Map<number, number>();
    write(memory, 0, [0xcd, 0x21]);
    write(memory, 0x84, [0x34, 0x12, 0x00, 0x20]);
    executor(state, memory).step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({
      eip: 0x1234,
      eflags: 0x2,
      registers: { esp: 0xfa },
      segments: { cs: { selector: 0x2000, base: 0x20000 } }
    });
    expect([0xfa, 0xfb, 0xfc, 0xfd, 0xfe, 0xff].map((address) => memory.get(address))).toEqual([
      2, 0, 0, 0, 2, 3
    ]);
  });

  it("uses 66-selected dword frames in real mode and IRET restores them", () => {
    const state = realModeState();
    state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: true });
    state.registers.write32(4, 0x100);
    state.flags.set(0x201);
    const memory = new Map<number, number>();
    write(memory, 0, [0x66, 0xcc]);
    write(memory, 0x0c, [0x40, 0x00, 0x00, 0x00]);
    write(memory, 0x40, [0x66, 0xcf]);
    const cpu = executor(state, memory);
    cpu.step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({ eip: 0x40, registers: { esp: 0xf4 }, eflags: 0x3 });
    cpu.step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({ eip: 2, registers: { esp: 0x100 }, eflags: 0x203 });
  });

  it("uses a same-privilege 32-bit protected interrupt gate and IRET frame", () => {
    const state = new RebuiltCpuState();
    state.writeCr0(1);
    state.writeSegment("cs", { selector: 8, base: 0, limit: 0xffff_ffff, default32: true, dpl: 0 });
    state.writeSegment("ss", {
      selector: 0x10,
      base: 0,
      limit: 0xffff_ffff,
      default32: true,
      dpl: 0
    });
    state.writeGdtr({ base: 0x200, limit: 0x1f });
    state.writeIdtr({ base: 0x300, limit: 0x1ff });
    state.writeEip(0);
    state.registers.write32(4, 0x100);
    state.flags.set(0x300);
    const memory = new Map<number, number>();
    write(memory, 0, [0xcd, 0x30]);
    write(memory, 0x80, [0xcf]);
    write(memory, 0x208, [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0]);
    write(memory, 0x300 + 0x180, [0x80, 0, 8, 0, 0, 0x8e, 0, 0]);
    const cpu = executor(state, memory);
    cpu.step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({
      eip: 0x80,
      eflags: 0x2,
      registers: { esp: 0xf4 },
      segments: { cs: { selector: 8, default32: true } }
    });
    cpu.step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({ eip: 2, eflags: 0x302, registers: { esp: 0x100 } });
  });

  it("does not invoke INTO when overflow is clear", () => {
    const state = realModeState();
    const memory = new Map<number, number>([[0, 0xce]]);
    executor(state, memory).step(dispatchRebuiltInstruction);
    expect(state.readEip()).toBe(1);
    expect(state.registers.read16(4)).toBe(0x100);
  });

  it("rejects a protected software interrupt whose gate DPL is below CPL", () => {
    const state = new RebuiltCpuState();
    state.writeCr0(1);
    state.writeSegment("cs", {
      selector: 0x0b,
      base: 0,
      limit: 0xffff_ffff,
      default32: true,
      dpl: 3
    });
    state.writeSegment("ss", {
      selector: 0x13,
      base: 0,
      limit: 0xffff_ffff,
      default32: true,
      dpl: 3
    });
    state.writeIdtr({ base: 0x300, limit: 0x1ff });
    state.writeEip(0);
    const memory = new Map<number, number>();
    write(memory, 0, [0xcd, 0x30]);
    write(memory, 0x300 + 0x180, [0, 0, 8, 0, 0, 0x8e, 0, 0]);
    expect(() => executor(state, memory).step(dispatchRebuiltInstruction)).toThrow(
      "Software interrupt gate privilege violation"
    );
    expect(state.readEip()).toBe(0);
  });
});
