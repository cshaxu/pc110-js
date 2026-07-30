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

function writeDescriptor(memory: Map<number, number>, type: number, dpl: number) {
  [0xff, 0x0f, 0, 0, 0, type | 0x10 | (dpl << 5) | 0x80, 0x40, 0].forEach((value, index) =>
    memory.set(0x108 + index, value)
  );
}

describe("rebuilt 0F 00 selector group", () => {
  it("stores LDTR and TR selectors through operand-sized register destinations", () => {
    const ldt = machine([0x66, 0x0f, 0x00, 0xc0]);
    ldt.state.writeLdtr({ selector: 0x1234, base: 0, limit: 0, default32: false });
    ldt.step();
    expect(ldt.state.registers.read32(0)).toBe(0x1234);
    const tr = machine([0x0f, 0x00, 0xc8]);
    tr.state.writeTr({ selector: 0x5678, base: 0, limit: 0, default32: false });
    tr.step();
    expect(tr.state.registers.read16(0)).toBe(0x5678);
  });

  it("reports invalid VERR and VERW selectors through ZF without changing the selector source", () => {
    const verr = machine([0x0f, 0x00, 0xe0]);
    verr.state.registers.write16(0, 0);
    verr.state.flags.set(0x40);
    verr.step();
    expect(verr.state.flags.has(0x40)).toBe(false);
    const verw = machine([0x0f, 0x00, 0xe8]);
    verw.state.registers.write16(0, 0);
    verw.step();
    expect(verw.state.flags.has(0x40)).toBe(false);
  });

  it("applies NXVM descriptor type and CPL/RPL checks to VERR and VERW", () => {
    for (const [opcode, type, dpl, expected] of [
      [0xe0, 2, 3, true],
      [0xe8, 2, 3, true],
      [0xe0, 2, 0, false],
      [0xe8, 2, 0, false],
      [0xe0, 0, 3, true],
      [0xe8, 0, 3, false]
    ] as const) {
      const result = machine([0x0f, 0x00, opcode]);
      result.state.writeSegment("cs", {
        selector: 0x0b,
        base: 0,
        limit: 0xffffffff,
        default32: true,
        dpl: 3
      });
      result.state.writeGdtr({ base: 0x100, limit: 0x17 });
      result.state.registers.write16(0, 0x0b);
      writeDescriptor(result.memory, type, dpl);
      result.step();
      expect(result.state.flags.has(0x40)).toBe(expected);
    }
  });

  it("delivers #GP(0) before nonzero-CPL LLDT and LTR change selector state", () => {
    for (const [opcode, ldt] of [
      [0xd0, true],
      [0xd8, false]
    ] as const) {
      const result = machine([0x0f, 0x00, opcode]);
      result.state.writeSegment("cs", {
        selector: 0x0b,
        base: 0,
        limit: 0xffffffff,
        default32: true,
        dpl: 3
      });
      result.state.writeSegment("ss", {
        selector: 0,
        base: 0,
        limit: 0xffffffff,
        default32: true,
        dpl: 0
      });
      result.state.writeGdtr({ base: 0x200, limit: 0x1f });
      result.state.writeIdtr({ base: 0x300, limit: 0x7f });
      result.state.registers.write16(0, 8);
      result.state.registers.write32(4, 0x100);
      result.state.writeLdtr({ selector: 0x1234, base: 0, limit: 0, default32: false });
      result.state.writeTr({ selector: 0x5678, base: 0, limit: 0, default32: false });
      result.memory.set(0x218, 0xff);
      result.memory.set(0x219, 0xff);
      result.memory.set(0x21d, 0xfa);
      result.memory.set(0x21e, 0xcf);
      [0x80, 0, 0x1b, 0, 0, 0x8e, 0, 0].forEach((value, index) =>
        result.memory.set(0x368 + index, value)
      );
      result.step();
      expect(result.state.readEip()).toBe(0x80);
      expect(ldt ? result.state.readLdtr().selector : result.state.readTr().selector).toBe(
        ldt ? 0x1234 : 0x5678
      );
    }
  });
});
