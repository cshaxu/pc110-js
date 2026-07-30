import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "../dispatch.js";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_CARRY, EFLAGS_ZERO } from "./arithmetic.js";

function createMachine(bytes: readonly number[]) {
  const state = new RebuiltCpuState();
  for (const segment of ["cs", "ds", "es", "fs"] as const) {
    state.writeSegment(segment, { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  }
  state.writeEip(0);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  const executor = new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  });
  return { state, memory, step: () => executor.step(dispatchRebuiltInstruction) };
}

describe("rebuilt A4-A7 and AA-AF string instructions", () => {
  it("moves bytes through a source override and ES destination", () => {
    const machine = createMachine([0x64, 0xa4]);
    machine.state.writeSegment("fs", {
      selector: 0,
      base: 0x1000,
      limit: 0xffff_ffff,
      default32: false
    });
    machine.state.writeSegment("es", {
      selector: 0,
      base: 0x2000,
      limit: 0xffff_ffff,
      default32: false
    });
    machine.state.registers.write16(6, 0x10);
    machine.state.registers.write16(7, 0x20);
    machine.memory.set(0x1010, 0x5a);
    machine.step();
    expect(machine.memory.get(0x2020)).toBe(0x5a);
    expect(machine.state.snapshot()).toMatchObject({ eip: 2, registers: { esi: 0x11, edi: 0x21 } });
  });

  it("repeats MOVSD with 66 and 67 one element per step", () => {
    const machine = createMachine([0xf3, 0x66, 0x67, 0xa5]);
    machine.state.registers.write32(1, 2);
    machine.state.registers.write32(6, 0x100);
    machine.state.registers.write32(7, 0x200);
    machine.memory.set(0x100, 0x78);
    machine.memory.set(0x101, 0x56);
    machine.memory.set(0x102, 0x34);
    machine.memory.set(0x103, 0x12);
    machine.memory.set(0x104, 0xef);
    machine.memory.set(0x105, 0xcd);
    machine.memory.set(0x106, 0xab);
    machine.memory.set(0x107, 0x90);
    machine.step();
    expect(machine.state.snapshot()).toMatchObject({
      eip: 0,
      registers: { ecx: 1, esi: 0x104, edi: 0x204 }
    });
    machine.step();
    expect(machine.state.snapshot()).toMatchObject({
      eip: 4,
      registers: { ecx: 0, esi: 0x108, edi: 0x208 }
    });
    expect([machine.memory.get(0x200), machine.memory.get(0x207)]).toEqual([0x78, 0x90]);
  });

  it("uses REP and REPNE conditions for CMPS and preserves its fault EIP loop boundary", () => {
    const equal = createMachine([0xf3, 0xa6]);
    equal.state.registers.write16(1, 2);
    equal.state.registers.write16(6, 0x10);
    equal.state.registers.write16(7, 0x20);
    equal.memory.set(0x10, 1);
    equal.memory.set(0x20, 1);
    equal.step();
    expect(equal.state.snapshot()).toMatchObject({
      eip: 0,
      registers: { ecx: 1, esi: 0x11, edi: 0x21 }
    });
    equal.memory.set(0x11, 2);
    equal.memory.set(0x21, 3);
    equal.step();
    expect(equal.state.readEip()).toBe(2);
    expect(equal.state.flags.has(EFLAGS_ZERO)).toBe(false);
    expect(equal.state.flags.has(EFLAGS_CARRY)).toBe(true);

    const different = createMachine([0xf2, 0xae]);
    different.state.registers.write8(0, 0x44);
    different.state.registers.write16(1, 2);
    different.state.registers.write16(7, 0x30);
    different.memory.set(0x30, 0x11);
    different.step();
    expect(different.state.snapshot()).toMatchObject({ eip: 0, registers: { ecx: 1, edi: 0x31 } });
    different.memory.set(0x31, 0x44);
    different.step();
    expect(different.state.readEip()).toBe(2);
    expect(different.state.flags.has(EFLAGS_ZERO)).toBe(true);
  });

  it("stores, loads, and scans with DF, accumulator widths, and unchanged non-arithmetic flags", () => {
    const store = createMachine([0xaa]);
    store.state.registers.write8(0, 0x5a);
    store.state.registers.write16(7, 0x20);
    store.state.flags.set(0x400 | EFLAGS_CARRY);
    store.step();
    expect(store.memory.get(0x20)).toBe(0x5a);
    expect(store.state.snapshot()).toMatchObject({ eip: 1, registers: { edi: 0x1f } });
    expect(store.state.flags.has(EFLAGS_CARRY)).toBe(true);

    const load = createMachine([0x66, 0xad]);
    load.state.registers.write16(6, 0x40);
    load.memory.set(0x40, 0x78);
    load.memory.set(0x41, 0x56);
    load.memory.set(0x42, 0x34);
    load.memory.set(0x43, 0x12);
    load.step();
    expect(load.state.registers.read32(0)).toBe(0x1234_5678);
    expect(load.state.registers.read16(6)).toBe(0x44);

    const scan = createMachine([0xae]);
    scan.state.registers.write8(0, 7);
    scan.state.registers.write16(7, 0x50);
    scan.memory.set(0x50, 7);
    scan.step();
    expect(scan.state.flags.has(EFLAGS_ZERO)).toBe(true);
  });
});
