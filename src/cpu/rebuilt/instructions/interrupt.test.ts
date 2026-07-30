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

  it("switches through a 32-bit TSS stack for an outer-privilege gate and IRET", () => {
    const state = new RebuiltCpuState();
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
    state.writeIdtr({ base: 0x300, limit: 0x1ff });
    state.writeTr({ selector: 0x28, base: 0x400, limit: 0x67, default32: true, type: 9 });
    state.writeEip(0);
    state.registers.write32(4, 0x100);
    state.flags.set(0x300);
    const memory = new Map<number, number>();
    write(memory, 0, [0xcd, 0x30]);
    write(memory, 0x80, [0xcf]);
    write(memory, 0x208, [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0]);
    write(memory, 0x218, [0xff, 0xff, 0, 0, 0, 0xfa, 0xcf, 0]);
    write(memory, 0x210, [0xff, 0xff, 0, 0, 0, 0x92, 0xcf, 0]);
    write(memory, 0x220, [0xff, 0xff, 0, 0, 0, 0xf2, 0xcf, 0]);
    write(memory, 0x480, [0x80, 0, 8, 0, 0, 0xee, 0, 0]);
    write(memory, 0x404, [0, 2, 0, 0, 0x10, 0]);
    const cpu = executor(state, memory);

    cpu.step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({
      eip: 0x80,
      registers: { esp: 0x1ec },
      segments: { cs: { selector: 8, dpl: 0 }, ss: { selector: 0x10, dpl: 0 } }
    });
    expect([0x1ec, 0x1f0, 0x1f4, 0x1f8, 0x1fc].map((address) => memory.get(address))).toEqual([
      2, 0x1b, 2, 0, 0x23
    ]);

    cpu.step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({
      eip: 2,
      registers: { esp: 0x100 },
      segments: { cs: { selector: 0x1b, dpl: 3 }, ss: { selector: 0x23, dpl: 3 } }
    });
  });

  it("switches through a 16-bit busy TSS stack for an outer-privilege gate and IRET", () => {
    const state = new RebuiltCpuState();
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
    state.writeIdtr({ base: 0x300, limit: 0x1ff });
    state.writeTr({ selector: 0x28, base: 0x400, limit: 0x2b, default32: false, type: 3 });
    state.writeEip(0);
    state.registers.write32(4, 0x100);
    state.flags.set(0x300);
    const memory = new Map<number, number>();
    write(memory, 0, [0xcd, 0x30]);
    write(memory, 0x80, [0xcf]);
    write(memory, 0x208, [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0]);
    write(memory, 0x218, [0xff, 0xff, 0, 0, 0, 0xfa, 0xcf, 0]);
    write(memory, 0x210, [0xff, 0xff, 0, 0, 0, 0x92, 0x0f, 0]);
    write(memory, 0x220, [0xff, 0xff, 0, 0, 0, 0xf2, 0xcf, 0]);
    write(memory, 0x480, [0x80, 0, 8, 0, 0, 0xee, 0, 0]);
    write(memory, 0x402, [0, 2, 0x10, 0]);
    const cpu = executor(state, memory);

    cpu.step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({
      eip: 0x80,
      registers: { esp: 0x1ec },
      segments: { cs: { selector: 8, dpl: 0 }, ss: { selector: 0x10, dpl: 0, default32: false } }
    });
    expect([0x1ec, 0x1f0, 0x1f4, 0x1f8, 0x1fc].map((address) => memory.get(address))).toEqual([
      2, 0x1b, 2, 0, 0x23
    ]);

    cpu.step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({
      eip: 2,
      registers: { esp: 0x100 },
      segments: { cs: { selector: 0x1b, dpl: 3 }, ss: { selector: 0x23, dpl: 3 } }
    });
  });

  it("switches through 32-bit and 16-bit TSS stacks for target rings one and two", () => {
    for (const [targetPrivilege, tss32] of [
      [1, true],
      [2, false]
    ] as const) {
      const state = new RebuiltCpuState();
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
      state.writeIdtr({ base: 0x300, limit: 0x1ff });
      state.writeTr({
        selector: 0x28,
        base: 0x400,
        limit: tss32 ? 0x67 : 0x2b,
        default32: tss32,
        type: tss32 ? 11 : 3
      });
      state.writeEip(0);
      state.registers.write32(4, 0x100);
      state.flags.set(0x300);
      const memory = new Map<number, number>();
      const targetAccess = 0x9a | (targetPrivilege << 5);
      const targetStackAccess = 0x92 | (targetPrivilege << 5);
      const targetStackPointer = 0x200 + targetPrivilege * 0x100;
      const targetStackSelector = 0x10 | targetPrivilege;
      write(memory, 0, [0xcd, 0x30]);
      write(memory, 0x80, [0xcf]);
      write(memory, 0x208, [0xff, 0xff, 0, 0, 0, targetAccess, 0xcf, 0]);
      write(memory, 0x218, [0xff, 0xff, 0, 0, 0, 0xfa, 0xcf, 0]);
      write(memory, 0x210, [0xff, 0xff, 0, 0, 0, targetStackAccess, tss32 ? 0xcf : 0x0f, 0]);
      write(memory, 0x220, [0xff, 0xff, 0, 0, 0, 0xf2, 0xcf, 0]);
      write(memory, 0x480, [0x80, 0, 8, 0, 0, 0xee, 0, 0]);
      const stackPointerOffset = (tss32 ? 4 : 2) + targetPrivilege * (tss32 ? 8 : 4);
      const stackSelectorOffset = (tss32 ? 8 : 4) + targetPrivilege * (tss32 ? 8 : 4);
      if (tss32)
        write(memory, 0x400 + stackPointerOffset, [
          targetStackPointer & 0xff,
          targetStackPointer >> 8,
          0,
          0
        ]);
      else
        write(memory, 0x400 + stackPointerOffset, [
          targetStackPointer & 0xff,
          targetStackPointer >> 8
        ]);
      write(memory, 0x400 + stackSelectorOffset, [targetStackSelector, 0]);
      const cpu = executor(state, memory);

      cpu.step(dispatchRebuiltInstruction);
      expect(state.snapshot()).toMatchObject({
        eip: 0x80,
        registers: { esp: targetStackPointer - 20 },
        segments: {
          cs: { selector: 8 | targetPrivilege, dpl: targetPrivilege },
          ss: { selector: targetStackSelector, dpl: targetPrivilege, default32: tss32 }
        }
      });

      cpu.step(dispatchRebuiltInstruction);
      expect(state.snapshot()).toMatchObject({
        eip: 2,
        registers: { esp: 0x100 },
        segments: { cs: { selector: 0x1b, dpl: 3 }, ss: { selector: 0x23, dpl: 3 } }
      });
    }
  });

  it("round-trips a virtual-8086 interrupt frame through a 32-bit TSS stack", () => {
    const state = new RebuiltCpuState();
    state.writeCr0(1);
    state.flags.write(0x0002_3002);
    for (const [name, selector] of [
      ["cs", 0x1000],
      ["ss", 0x2000],
      ["es", 0x3000],
      ["ds", 0x4000],
      ["fs", 0x5000],
      ["gs", 0x6000]
    ] as const)
      state.writeSegment(name, {
        selector,
        base: selector << 4,
        limit: 0xffff,
        default32: false,
        dpl: 3
      });
    state.writeGdtr({ base: 0x200, limit: 0x2f });
    state.writeIdtr({ base: 0x300, limit: 0x1ff });
    state.writeTr({ selector: 0x28, base: 0x400, limit: 0x67, default32: true, type: 9 });
    state.writeEip(0);
    state.registers.write32(4, 0x12340080);
    const memory = new Map<number, number>();
    write(memory, 0x10000, [0x66, 0xcd, 0x30]);
    write(memory, 0x80, [0xcf]);
    write(memory, 0x208, [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0]);
    write(memory, 0x210, [0xff, 0xff, 0, 0, 0, 0x92, 0xcf, 0]);
    write(memory, 0x480, [0x80, 0, 8, 0, 0, 0xee, 0, 0]);
    write(memory, 0x404, [0, 2, 0, 0, 0x10, 0]);
    const cpu = executor(state, memory);

    cpu.step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({ eip: 0x80, registers: { esp: 0x1dc } });
    expect(state.flags.read() & 0x00020000).toBe(0);
    expect(state.readSegment("ds").valid).toBe(false);

    cpu.step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({ eip: 3, registers: { esp: 0x12340080 } });
    expect(state.flags.read() & 0x00020000).toBe(0x00020000);
    expect(
      ["cs", "ss", "es", "ds", "fs", "gs"].map((name) => state.readSegment(name as "cs").selector)
    ).toEqual([0x1000, 0x2000, 0x3000, 0x4000, 0x5000, 0x6000]);
  });

  it("round-trips a virtual-8086 interrupt frame through a 16-bit TSS stack", () => {
    const state = new RebuiltCpuState();
    state.writeCr0(1);
    state.flags.write(0x0002_3002);
    for (const [name, selector] of [
      ["cs", 0x1000],
      ["ss", 0x2000],
      ["es", 0x3000],
      ["ds", 0x4000],
      ["fs", 0x5000],
      ["gs", 0x6000]
    ] as const)
      state.writeSegment(name, {
        selector,
        base: selector << 4,
        limit: 0xffff,
        default32: false,
        dpl: 3
      });
    state.writeGdtr({ base: 0x200, limit: 0x2f });
    state.writeIdtr({ base: 0x300, limit: 0x1ff });
    state.writeTr({ selector: 0x28, base: 0x400, limit: 0x2b, default32: false, type: 3 });
    state.writeEip(0);
    state.registers.write32(4, 0x12340080);
    const memory = new Map<number, number>();
    write(memory, 0x10000, [0x66, 0xcd, 0x30]);
    write(memory, 0x80, [0xcf]);
    write(memory, 0x208, [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0]);
    write(memory, 0x210, [0xff, 0xff, 0, 0, 0, 0x92, 0xcf, 0]);
    write(memory, 0x480, [0x80, 0, 8, 0, 0, 0xee, 0, 0]);
    write(memory, 0x402, [0, 2, 0x10, 0]);
    const cpu = executor(state, memory);

    cpu.step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({ eip: 0x80, registers: { esp: 0x1dc } });
    expect(state.flags.read() & 0x00020000).toBe(0);
    expect(state.readSegment("ds").valid).toBe(false);

    cpu.step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({ eip: 3, registers: { esp: 0x12340080 } });
    expect(state.flags.read() & 0x00020000).toBe(0x00020000);
    expect(
      ["cs", "ss", "es", "ds", "fs", "gs"].map((name) => state.readSegment(name as "cs").selector)
    ).toEqual([0x1000, 0x2000, 0x3000, 0x4000, 0x5000, 0x6000]);
  });

  it("delivers #GP(0) for virtual-8086 software interrupts below IOPL three", () => {
    for (const bytes of [[0xcc], [0xcd, 0x30], [0xce]]) {
      const state = new RebuiltCpuState();
      state.writeCr0(1);
      state.flags.write(0x0002_0802);
      state.writeSegment("cs", {
        selector: 0x1000,
        base: 0x10000,
        limit: 0xffff,
        default32: false,
        dpl: 3
      });
      state.writeSegment("ss", {
        selector: 0x2000,
        base: 0x20000,
        limit: 0xffff,
        default32: false,
        dpl: 3
      });
      state.writeGdtr({ base: 0x200, limit: 0x1f });
      state.writeIdtr({ base: 0x300, limit: 0x7f });
      state.writeTr({ selector: 0x18, base: 0x400, limit: 0x67, default32: true, type: 9 });
      state.writeEip(0);
      state.registers.write32(4, 0x100);
      const memory = new Map<number, number>();
      write(memory, 0x10000, bytes);
      write(memory, 0x208, [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0]);
      write(memory, 0x210, [0xff, 0xff, 0, 0, 0, 0x92, 0xcf, 0]);
      write(memory, 0x368, [0x80, 0, 8, 0, 0, 0x8e, 0, 0]);
      write(memory, 0x404, [0, 2, 0, 0, 0x10, 0]);

      executor(state, memory).step(dispatchRebuiltInstruction);

      expect(state.snapshot()).toMatchObject({ eip: 0x80, registers: { esp: 0x1d8 } });
      expect(state.flags.read() & 0x00020000).toBe(0);
    }
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
    state.writeGdtr({ base: 0x200, limit: 0x2f });
    state.writeIdtr({ base: 0x300, limit: 0x1ff });
    state.writeTr({ selector: 0x28, base: 0x400, limit: 0x67, default32: true, type: 9 });
    state.registers.write32(4, 0x100);
    state.writeEip(0);
    const memory = new Map<number, number>();
    write(memory, 0, [0xcd, 0x30]);
    write(memory, 0x208, [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0]);
    write(memory, 0x210, [0xff, 0xff, 0, 0, 0, 0x92, 0xcf, 0]);
    write(memory, 0x300 + 0x180, [0, 0, 8, 0, 0, 0x8e, 0, 0]);
    write(memory, 0x368, [0x80, 0, 8, 0, 0, 0x8e, 0, 0]);
    write(memory, 0x404, [0, 2, 0, 0, 0x10, 0]);

    expect(() => executor(state, memory).step(dispatchRebuiltInstruction)).not.toThrow();
    expect(state.snapshot()).toMatchObject({
      eip: 0x80,
      registers: { esp: 0x1e8 },
      segments: { cs: { selector: 8, dpl: 0 }, ss: { selector: 0x10, dpl: 0 } }
    });
    expect([0x1e8, 0x1e9, 0x1ea, 0x1eb].map((address) => memory.get(address))).toEqual([
      0x82, 1, 0, 0
    ]);
  });

  it("delivers #GP from an invalid outer-to-inner protected IRET without leaking a host error", () => {
    const state = new RebuiltCpuState();
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
    state.writeEip(0);
    state.registers.write32(4, 0x100);
    const memory = new Map<number, number>();
    write(memory, 0, [0xcf]);
    write(memory, 0x208, [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0]);
    write(memory, 0x210, [0xff, 0xff, 0, 0, 0, 0x92, 0xcf, 0]);
    write(memory, 0x218, [0xff, 0xff, 0, 0, 0, 0xfa, 0xcf, 0]);
    write(memory, 0x220, [0xff, 0xff, 0, 0, 0, 0xf2, 0xcf, 0]);
    write(memory, 0x368, [0x80, 0, 8, 0, 0, 0x8e, 0, 0]);
    write(memory, 0x404, [0, 2, 0, 0, 0x10, 0]);
    write(memory, 0x100, [0x34, 0x12, 0, 0, 8, 0, 0, 0, 2, 0, 0, 0]);

    expect(() => executor(state, memory).step(dispatchRebuiltInstruction)).not.toThrow();
    expect(state.snapshot()).toMatchObject({
      eip: 0x80,
      registers: { esp: 0x1e8 },
      segments: { cs: { selector: 8, dpl: 0 }, ss: { selector: 0x10, dpl: 0 } }
    });
    expect([0x1e8, 0x1e9, 0x1ea, 0x1eb].map((address) => memory.get(address))).toEqual([
      8, 0, 0, 0
    ]);
  });
});
