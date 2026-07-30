import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "./dispatch.js";
import { RebuiltCpuExecutor } from "./execution.js";
import { RebuiltTripleFaultError } from "./events/interrupt-delivery.js";
import { RebuiltCpuState } from "./state/cpu-state.js";

describe("RebuiltCpuExecutor", () => {
  it("fetches from reset CS:EIP and preserves instruction-start EIP for dispatch", () => {
    const state = new RebuiltCpuState();
    const bytes = new Map<number, number>([[0xfffffff0, 0x90]]);
    const executor = new RebuiltCpuExecutor(state, {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: (address, value) => {
        bytes.set(address, value);
      }
    });

    executor.step(({ instruction, state: active }) => {
      expect(instruction).toMatchObject({ startEip: 0xfff0, opcode: 0x90 });
      active.advanceEip(instruction.length);
    });

    expect(state.readEip()).toBe(0xfff1);
  });

  it("fetches instructions through rebuilt 80386 paging", () => {
    const state = new RebuiltCpuState();
    const bytes = new Map<number, number>();
    const write32 = (address: number, value: number) => {
      for (let index = 0; index < 4; index += 1)
        bytes.set(address + index, (value >>> (index * 8)) & 0xff);
    };
    state.writeCr0(0x80000001);
    state.writeCr3(0x1000);
    state.writeSegment("cs", { selector: 8, base: 0, limit: 0xffffffff, default32: true, dpl: 0 });
    state.writeEip(0);
    write32(0x1000, 0x2003);
    write32(0x2000, 0x3003);
    bytes.set(0x3000, 0x90);
    const executor = new RebuiltCpuExecutor(state, {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: (address, value) => bytes.set(address, value)
    });

    executor.step(({ instruction, state: active }) => {
      expect(instruction.opcode).toBe(0x90);
      active.advanceEip(instruction.length);
    });
    expect(state.readEip()).toBe(1);
  });

  it("uses virtual-8086 segment bases and 16-bit defaults despite cached D/B values", () => {
    const state = new RebuiltCpuState();
    const bytes = new Map<number, number>();
    state.writeCr0(1);
    state.flags.write(0x00020000);
    state.writeSegment("cs", {
      selector: 0x1000,
      base: 0,
      limit: 0,
      default32: true,
      valid: false,
      dpl: 0
    });
    state.writeEip(0xfffe);
    bytes.set(0x1fffe, 0x66);
    bytes.set(0x1ffff, 0x67);
    bytes.set(0x10000, 0x90);
    const executor = new RebuiltCpuExecutor(state, {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: (address, value) => bytes.set(address, value)
    });

    executor.step(({ instruction, state: active }) => {
      expect(instruction.prefixes).toMatchObject({ operandSize: 32, addressSize: 32 });
      active.advanceEip(instruction.length);
    });

    expect(state.readEip()).toBe(1);
  });

  it("delivers #GP(0) at the instruction start when a decoded opcode exceeds fifteen bytes", () => {
    const state = new RebuiltCpuState();
    const bytes = new Map<number, number>();
    state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false });
    state.writeEip(0);
    state.registers.write16(4, 0x100);
    Array.from({ length: 14 }, () => 0x66).forEach((value, index) => bytes.set(index, value));
    bytes.set(14, 0x0f);
    bytes.set(15, 0x80);
    bytes.set(0x34, 0x34);
    bytes.set(0x35, 0x12);
    bytes.set(0x36, 0x00);
    bytes.set(0x37, 0x20);

    expect(
      new RebuiltCpuExecutor(state, {
        readUint8: (address) => bytes.get(address) ?? 0,
        writeUint8: (address, value) => bytes.set(address, value)
      }).step(dispatchRebuiltInstruction)
    ).toBeUndefined();
    expect(state.snapshot()).toMatchObject({
      eip: 0x1234,
      segments: { cs: { selector: 0x2000 } },
      registers: { esp: 0xfa }
    });
    expect(bytes.get(0xfa)).toBe(0);
  });

  it("delivers a protected page fault with the faulting EIP and error code", () => {
    const state = new RebuiltCpuState();
    const bytes = new Map<number, number>();
    const write = (address: number, values: readonly number[]) =>
      values.forEach((value, index) => bytes.set(address + index, value));
    const write32 = (address: number, value: number) =>
      write(
        address,
        Array.from({ length: 4 }, (_, index) => (value >>> (index * 8)) & 0xff)
      );
    state.writeCr0(0x80000001);
    state.writeCr3(0x1000);
    state.writeSegment("cs", { selector: 8, base: 0, limit: 0xffffffff, default32: true, dpl: 0 });
    state.writeSegment("ds", {
      selector: 0x10,
      base: 0x400000,
      limit: 0xffffffff,
      default32: true,
      dpl: 0
    });
    state.writeSegment("ss", {
      selector: 0x10,
      base: 0,
      limit: 0xffffffff,
      default32: true,
      dpl: 0
    });
    state.writeGdtr({ base: 0x4000, limit: 0x1f });
    state.writeIdtr({ base: 0x5000, limit: 0x7f });
    state.writeEip(0);
    state.registers.write32(4, 0x1000);
    write32(0x1000, 0x2003);
    write32(0x2000, 0x3003);
    write(0x3000, [0x90]);
    write(0x4008, [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0]);
    write(0x5070, [0x40, 0, 8, 0, 0, 0x8e, 0, 0]);
    const executor = new RebuiltCpuExecutor(state, {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: (address, value) => bytes.set(address, value)
    });

    executor.step(({ memory }) => memory.read8("ds", 0, 32));
    expect(state.snapshot()).toMatchObject({ eip: 0x40, registers: { esp: 0xff0 } });
    expect([0x3ff0, 0x3ff4, 0x3ff8].map((address) => bytes.get(address))).toEqual([0, 0, 8]);
    expect(state.readCr2()).toBe(0x400000);
  });

  it("delivers an instruction-fetch page fault before dispatch", () => {
    const state = new RebuiltCpuState();
    const bytes = new Map<number, number>();
    const write = (address: number, values: readonly number[]) =>
      values.forEach((value, index) => bytes.set(address + index, value));
    const write32 = (address: number, value: number) =>
      write(
        address,
        Array.from({ length: 4 }, (_, index) => (value >>> (index * 8)) & 0xff)
      );
    state.writeCr0(0x80000001);
    state.writeCr3(0x1000);
    state.writeSegment("cs", {
      selector: 8,
      base: 0x400000,
      limit: 0xffffffff,
      default32: true,
      dpl: 0
    });
    state.writeSegment("ss", {
      selector: 0x10,
      base: 0,
      limit: 0xffffffff,
      default32: true,
      dpl: 0
    });
    state.writeGdtr({ base: 0x4000, limit: 0x1f });
    state.writeIdtr({ base: 0x5000, limit: 0x7f });
    state.writeEip(0);
    state.registers.write32(4, 0x1000);
    write32(0x1000, 0x2003);
    write32(0x2000, 0x3003);
    write(0x4008, [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0]);
    write(0x5070, [0x40, 0, 8, 0, 0, 0x8e, 0, 0]);
    let dispatched = false;
    const trace: Array<{ readonly fault?: boolean }> = [];
    const executor = new RebuiltCpuExecutor(
      state,
      {
        readUint8: (address) => bytes.get(address) ?? 0,
        writeUint8: (address, value) => bytes.set(address, value)
      },
      (event) => trace.push(event)
    );

    expect(executor.step(() => (dispatched = true))).toBeUndefined();
    expect(dispatched).toBe(false);
    expect(state.snapshot()).toMatchObject({ eip: 0x40, registers: { esp: 0xff0 } });
    expect([0x3ff0, 0x3ff4, 0x3ff8].map((address) => bytes.get(address))).toEqual([0, 0, 8]);
    expect(state.readCr2()).toBe(0x400000);
    expect(trace).toHaveLength(1);
    expect(trace[0]?.fault).toBe(true);
  });

  it("delivers a non-present segment-load fault through the rebuilt IDT path", () => {
    const state = new RebuiltCpuState();
    const bytes = new Map<number, number>();
    const write = (address: number, values: readonly number[]) =>
      values.forEach((value, index) => bytes.set(address + index, value));
    state.writeCr0(1);
    state.writeSegment("cs", { selector: 8, base: 0, limit: 0xffff, default32: false, dpl: 0 });
    state.writeSegment("ss", {
      selector: 0x18,
      base: 0,
      limit: 0xffffffff,
      default32: true,
      dpl: 0
    });
    state.writeGdtr({ base: 0x200, limit: 0x1f });
    state.writeIdtr({ base: 0x300, limit: 0x7f });
    state.writeEip(0);
    state.registers.write16(0, 0x10);
    state.registers.write32(4, 0x100);
    write(0, [0x8e, 0xd8]);
    write(0x208, [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0]);
    write(0x210, [0xff, 0xff, 0, 0, 0, 0x12, 0xcf, 0]);
    write(0x358, [0x40, 0, 8, 0, 0, 0x8e, 0, 0]);
    new RebuiltCpuExecutor(state, {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: (address, value) => bytes.set(address, value)
    }).step(dispatchRebuiltInstruction);

    expect(state.snapshot()).toMatchObject({ eip: 0x40, registers: { esp: 0xf0 } });
    expect([0xf0, 0xf4, 0xf8].map((address) => bytes.get(address))).toEqual([0x10, 0, 8]);
  });

  it("escalates contributory delivery failures to a protected double fault", () => {
    const state = new RebuiltCpuState();
    const bytes = new Map<number, number>();
    const write = (address: number, values: readonly number[]) =>
      values.forEach((value, index) => bytes.set(address + index, value));
    state.writeCr0(1);
    state.writeSegment("cs", { selector: 8, base: 0, limit: 0xffff, default32: false, dpl: 0 });
    state.writeSegment("ss", {
      selector: 0x10,
      base: 0,
      limit: 0xffffffff,
      default32: true,
      dpl: 0
    });
    state.writeGdtr({ base: 0x200, limit: 0x1f });
    state.writeIdtr({ base: 0x300, limit: 0x7f });
    state.writeEip(0);
    state.registers.write32(4, 0x100);
    write(0, [0x82]);
    write(0x208, [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0]);
    write(0x340, [0x40, 0, 8, 0, 0, 0x8e, 0, 0]);
    new RebuiltCpuExecutor(state, {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: (address, value) => bytes.set(address, value)
    }).step(dispatchRebuiltInstruction);

    expect(state.snapshot()).toMatchObject({ eip: 0x40, registers: { esp: 0xf0 } });
    expect([0xf0, 0xf4, 0xf8, 0xfc].map((address) => bytes.get(address))).toEqual([0, 0, 8, 2]);
  });

  it("delivers the secondary general-protection fault after a benign fault", () => {
    const state = new RebuiltCpuState();
    const bytes = new Map<number, number>();
    const write = (address: number, values: readonly number[]) =>
      values.forEach((value, index) => bytes.set(address + index, value));
    state.writeCr0(1);
    state.writeSegment("cs", { selector: 8, base: 0, limit: 0xffff, default32: false, dpl: 0 });
    state.writeSegment("ss", {
      selector: 0x10,
      base: 0,
      limit: 0xffffffff,
      default32: true,
      dpl: 0
    });
    state.writeGdtr({ base: 0x200, limit: 0x1f });
    state.writeIdtr({ base: 0x300, limit: 0x7f });
    state.writeEip(0);
    state.registers.write32(4, 0x100);
    write(0, [0x82]);
    write(0x208, [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0]);
    write(0x368, [0x60, 0, 8, 0, 0, 0x8e, 0, 0]);
    new RebuiltCpuExecutor(state, {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: (address, value) => bytes.set(address, value)
    }).step(dispatchRebuiltInstruction);

    expect(state.snapshot()).toMatchObject({ eip: 0x60, registers: { esp: 0xf0 } });
    expect(bytes.get(0xf0)).toBe(0x32);
  });

  it("reports a triple fault when double-fault delivery fails", () => {
    const state = new RebuiltCpuState();
    const bytes = new Map<number, number>();
    state.writeCr0(1);
    state.writeSegment("cs", { selector: 8, base: 0, limit: 0xffff, default32: false, dpl: 0 });
    state.writeSegment("ss", {
      selector: 0x10,
      base: 0,
      limit: 0xffffffff,
      default32: true,
      dpl: 0
    });
    state.writeGdtr({ base: 0x200, limit: 0x1f });
    state.writeIdtr({ base: 0x300, limit: 0x7f });
    state.writeEip(0);
    state.registers.write32(4, 0x100);
    bytes.set(0, 0x82);
    bytes.set(0x208, 0xff);
    bytes.set(0x209, 0xff);
    bytes.set(0x20d, 0x9a);
    bytes.set(0x20e, 0xcf);
    const executor = new RebuiltCpuExecutor(state, {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: (address, value) => bytes.set(address, value)
    });

    expect(() => executor.step(dispatchRebuiltInstruction)).toThrow(RebuiltTripleFaultError);
  });
});
