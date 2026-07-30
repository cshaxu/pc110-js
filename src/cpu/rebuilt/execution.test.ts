import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "./execution.js";
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
});
