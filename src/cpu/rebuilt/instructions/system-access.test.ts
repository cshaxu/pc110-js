import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "../dispatch.js";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";

function machine(bytes: number[]) {
  const state = new RebuiltCpuState();
  for (const segment of ["cs", "ds", "es", "ss", "fs", "gs"] as const)
    state.writeSegment(segment, { selector: 0, base: 0, limit: 0xffffffff, default32: false });
  state.writeEip(0);
  state.writeCr0(0x7ffffff1);
  const memory = new Map(bytes.map((value, index) => [index, value]));
  const executor = new RebuiltCpuExecutor(state, {
    readUint8: (a) => memory.get(a) ?? 0,
    writeUint8: (a, v) => memory.set(a, v)
  });
  return { state, memory, step: () => executor.step(dispatchRebuiltInstruction) };
}

function writeDescriptor(memory: Map<number, number>, type: number, dpl = 0) {
  [0xff, 0x0f, 0, 0, 0, type | 0x10 | (dpl << 5) | 0x80, 0x40, 0].forEach((value, index) =>
    memory.set(0x108 + index, value)
  );
}

describe("rebuilt LAR, LSL, and CLTS", () => {
  it("clears ZF for an invalid LAR selector and clears CR0.TS through CLTS", () => {
    const lar = machine([0x0f, 0x02, 0xc0]);
    lar.state.registers.write16(0, 0);
    lar.state.flags.set(0x40);
    lar.step();
    expect(lar.state.flags.has(0x40)).toBe(false);
    const clts = machine([0x0f, 0x06]);
    clts.state.writeCr0(0x7ffffff9);
    clts.step();
    expect(clts.state.readCr0() & 8).toBe(0);
  });

  it("loads access rights and limit from an accessible GDT descriptor", () => {
    const lar = machine([0x0f, 0x02, 0xc0]);
    lar.state.writeGdtr({ base: 0x100, limit: 0x17 });
    lar.state.registers.write16(0, 8);
    writeDescriptor(lar.memory, 2);
    lar.step();
    expect(lar.state.flags.has(0x40)).toBe(true);
    expect(lar.state.registers.read16(0)).toBe(0x9200);
    const lsl = machine([0x0f, 0x03, 0xc0]);
    lsl.state.writeGdtr({ base: 0x100, limit: 0x17 });
    lsl.state.registers.write16(0, 8);
    writeDescriptor(lsl.memory, 2);
    lsl.step();
    expect(lsl.state.flags.has(0x40)).toBe(true);
    expect(lsl.state.registers.read16(0)).toBe(0x0fff);
  });

  it("uses the default and overridden operand widths without changing EIP length", () => {
    const lar = machine([0x0f, 0x02, 0xc0]);
    lar.state.writeSegment("cs", {
      selector: 0,
      base: 0,
      limit: 0xffffffff,
      default32: true,
      dpl: 0
    });
    lar.state.writeGdtr({ base: 0x100, limit: 0x17 });
    lar.state.registers.write16(0, 8);
    writeDescriptor(lar.memory, 2);
    lar.step();
    expect(lar.state.registers.read32(0)).toBe(0x00409200);
    expect(lar.state.readEip()).toBe(3);

    const lsl = machine([0x66, 0x0f, 0x03, 0xc0]);
    lsl.state.writeSegment("cs", {
      selector: 0,
      base: 0,
      limit: 0xffffffff,
      default32: true,
      dpl: 0
    });
    lsl.state.writeGdtr({ base: 0x100, limit: 0x17 });
    lsl.state.registers.write32(0, 0xdead0008);
    writeDescriptor(lsl.memory, 2);
    lsl.step();
    expect(lsl.state.registers.read32(0)).toBe(0xdead0fff);
    expect(lsl.state.readEip()).toBe(4);
  });

  it("accepts only the NXVM-defined system descriptor classes", () => {
    const lar = machine([0x0f, 0x02, 0xc0]);
    lar.state.writeGdtr({ base: 0x100, limit: 0x17 });
    lar.state.registers.write16(0, 8);
    [0xff, 0x0f, 0, 0, 0, 0x85, 0x40, 0].forEach((value, index) =>
      lar.memory.set(0x108 + index, value)
    );
    lar.step();
    expect(lar.state.flags.has(0x40)).toBe(true);

    const lsl = machine([0x0f, 0x03, 0xc0]);
    lsl.state.writeGdtr({ base: 0x100, limit: 0x17 });
    lsl.state.registers.write16(0, 8);
    [0xff, 0x0f, 0, 0, 0, 0x85, 0x40, 0].forEach((value, index) =>
      lsl.memory.set(0x108 + index, value)
    );
    lsl.step();
    expect(lsl.state.flags.has(0x40)).toBe(false);
  });

  it("delivers #GP(0) before CLTS changes CR0.TS at nonzero CPL", () => {
    const clts = machine([0x0f, 0x06]);
    clts.state.writeSegment("cs", {
      selector: 0x0b,
      base: 0,
      limit: 0xffffffff,
      default32: true,
      dpl: 3
    });
    clts.state.writeSegment("ss", {
      selector: 0,
      base: 0,
      limit: 0xffffffff,
      default32: true,
      dpl: 0
    });
    clts.state.writeCr0(9);
    clts.state.writeGdtr({ base: 0x200, limit: 0x1f });
    clts.state.writeIdtr({ base: 0x300, limit: 0x7f });
    clts.state.registers.write32(4, 0x100);
    clts.memory.set(0x218, 0xff);
    clts.memory.set(0x219, 0xff);
    clts.memory.set(0x21d, 0xfa);
    clts.memory.set(0x21e, 0xcf);
    [0x80, 0, 0x1b, 0, 0, 0x8e, 0, 0].forEach((value, index) =>
      clts.memory.set(0x368 + index, value)
    );
    clts.step();
    expect(clts.state.readCr0() & 8).toBe(8);
    expect(clts.state.readEip()).toBe(0x80);
    expect(clts.memory.get(0xf4)).toBe(0);
  });
});
