import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "../dispatch.js";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_CARRY, EFLAGS_ZERO } from "./arithmetic.js";

function createMachine(bytes: readonly number[]) {
  const state = new RebuiltCpuState();
  for (const segment of ["cs", "ds", "es", "ss", "fs", "gs"] as const) {
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

describe("rebuilt 0F A0-AF extended instructions", () => {
  it("pushes and pops FS/GS selectors through operand-sized stack data", () => {
    const push = createMachine([0x66, 0x0f, 0xa0]);
    push.state.writeSegment("fs", {
      selector: 0x1234,
      base: 0x12340,
      limit: 0xffff,
      default32: false
    });
    push.state.registers.write16(4, 0x20);
    push.step();
    expect(push.state.registers.read16(4)).toBe(0x1c);
    expect([push.memory.get(0x1c), push.memory.get(0x1f)]).toEqual([0x34, 0]);

    const pop = createMachine([0x0f, 0xa9]);
    pop.state.registers.write16(4, 0x20);
    pop.memory.set(0x20, 0x78);
    pop.memory.set(0x21, 0x56);
    pop.step();
    expect(pop.state.readSegment("gs").selector).toBe(0x5678);
    expect(pop.state.registers.read16(4)).toBe(0x22);
  });

  it("executes register and memory bit operations with carry-only flags", () => {
    const bts = createMachine([0x0f, 0xab, 0xc8]);
    bts.state.registers.write16(0, 0);
    bts.state.registers.write16(1, 3);
    bts.state.flags.set(EFLAGS_ZERO);
    bts.step();
    expect(bts.state.registers.read16(0)).toBe(8);
    expect(bts.state.flags.has(EFLAGS_CARRY)).toBe(false);
    expect(bts.state.flags.has(EFLAGS_ZERO)).toBe(true);

    const btr = createMachine([0x67, 0x0f, 0xb3, 0x0d, 0x00, 0x01, 0x00, 0x00]);
    btr.state.registers.write32(1, 16);
    btr.memory.set(0x102, 1);
    btr.step();
    expect(btr.memory.get(0x102)).toBe(0);
    expect(btr.state.flags.has(EFLAGS_CARRY)).toBe(true);
  });

  it("executes immediate and CL double shifts with defined result flags", () => {
    const shld = createMachine([0x0f, 0xa4, 0xc8, 0x01]);
    shld.state.registers.write16(0, 0x8000);
    shld.state.registers.write16(1, 0x8000);
    shld.step();
    expect(shld.state.registers.read16(0)).toBe(1);
    expect(shld.state.flags.has(EFLAGS_CARRY)).toBe(true);

    const shrd = createMachine([0x0f, 0xad, 0xc8]);
    shrd.state.registers.write16(0, 2);
    shrd.state.registers.write16(1, 0x8000);
    shrd.state.registers.write8(1, 1);
    shrd.step();
    expect(shrd.state.registers.read16(0)).toBe(0x8001);
  });

  it("executes IMUL, far data loads, and MOVZX without external runtimes", () => {
    const imul = createMachine([0x66, 0x0f, 0xaf, 0xc1]);
    imul.state.registers.write32(0, 0xffff_fffe);
    imul.state.registers.write32(1, 3);
    imul.step();
    expect(imul.state.registers.read32(0)).toBe(0xffff_fffa);

    const lfs = createMachine([0x0f, 0xb4, 0x06, 0x00, 0x01]);
    lfs.memory.set(0x100, 0x34);
    lfs.memory.set(0x101, 0x12);
    lfs.memory.set(0x102, 0x00);
    lfs.memory.set(0x103, 0x20);
    lfs.step();
    expect(lfs.state.registers.read16(0)).toBe(0x1234);
    expect(lfs.state.readSegment("fs").selector).toBe(0x2000);

    const movzx = createMachine([0x66, 0x0f, 0xb6, 0xc1]);
    movzx.state.registers.write8(1, 0xab);
    movzx.step();
    expect(movzx.state.registers.read32(0)).toBe(0xab);
  });

  it("delivers undefined 0F A-family faults at the instruction EIP", () => {
    for (const opcode of [0xa2, 0xa6, 0xa7, 0xaa, 0xae]) {
      const machine = createMachine([0x0f, opcode]);
      machine.memory.set(0x18, 0x34);
      machine.memory.set(0x19, 0x12);
      machine.memory.set(0x1a, 0x00);
      machine.memory.set(0x1b, 0x20);
      machine.state.registers.write16(4, 0x100);
      machine.step();
      expect(machine.state.readEip()).toBe(0x1234);
      expect(machine.state.readSegment("cs").selector).toBe(0x2000);
    }
  });
});
