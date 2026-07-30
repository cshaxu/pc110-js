import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "../dispatch.js";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";

function machine(bytes: number[]) {
  const state = new RebuiltCpuState();
  for (const segment of ["cs", "ds", "es", "ss", "fs", "gs"] as const)
    state.writeSegment(segment, { selector: 0, base: 0, limit: 0xffffffff, default32: false });
  state.writeEip(0);
  const memory = new Map(bytes.map((value, index) => [index, value]));
  const executor = new RebuiltCpuExecutor(state, {
    readUint8: (a) => memory.get(a) ?? 0,
    writeUint8: (a, v) => memory.set(a, v)
  });
  return { state, memory, step: () => executor.step(dispatchRebuiltInstruction) };
}

describe("rebuilt 0F 01 system group", () => {
  it("stores and loads descriptor tables with operand-size-selected bases", () => {
    const store = machine([0x66, 0x0f, 0x01, 0x06, 0x00, 0x01]);
    store.state.writeGdtr({ base: 0x12345678, limit: 0x9abc });
    store.step();
    expect([store.memory.get(0x100), store.memory.get(0x105)]).toEqual([0xbc, 0x12]);
    const load = machine([0x0f, 0x01, 0x16, 0x00, 0x01]);
    load.memory.set(0x100, 0x34);
    load.memory.set(0x101, 0x12);
    load.memory.set(0x102, 0x78);
    load.memory.set(0x103, 0x56);
    load.memory.set(0x104, 0x34);
    load.step();
    expect(load.state.readGdtr()).toEqual({ limit: 0x1234, base: 0x345678 });
  });

  it("stores SMSW and preserves protected mode when LMSW requests clearing it", () => {
    const smsw = machine([0x66, 0x0f, 0x01, 0xe0]);
    smsw.state.writeCr0(0x7ffffff1);
    smsw.step();
    expect(smsw.state.registers.read32(0)).toBe(0xfff1);
    const lmsw = machine([0x0f, 0x01, 0xf0]);
    lmsw.state.writeCr0(0x7ffffff1);
    lmsw.state.registers.write16(0, 0);
    lmsw.step();
    expect(lmsw.state.readCr0() & 0xf).toBe(1);
  });

  it("loads a descriptor table through default-32 addressing", () => {
    const load = machine([0x0f, 0x01, 0x15, 0x00, 0x01, 0x00, 0x00]);
    load.state.writeSegment("cs", {
      selector: 0,
      base: 0,
      limit: 0xffffffff,
      default32: true
    });
    [0x34, 0x12, 0x78, 0x56, 0x34, 0x12].forEach((value, index) =>
      load.memory.set(0x100 + index, value)
    );
    load.step();
    expect(load.state.readGdtr()).toEqual({ limit: 0x1234, base: 0x12345678 });
    expect(load.state.readEip()).toBe(7);
  });
});
