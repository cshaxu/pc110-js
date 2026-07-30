import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "./dispatch.js";
import { RebuiltCpuExecutor } from "./execution.js";
import { RebuiltCpuState } from "./state/cpu-state.js";

describe("rebuilt opcode dispatcher", () => {
  it("executes a mixed instruction sequence without per-step handler selection", () => {
    const state = new RebuiltCpuState();
    state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
    state.writeEip(0);
    const bytes = new Map<number, number>([
      [0, 0xb8],
      [1, 1],
      [2, 0],
      [3, 0x40],
      [4, 0xf9]
    ]);
    const executor = new RebuiltCpuExecutor(state, {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: () => undefined
    });
    executor.step(dispatchRebuiltInstruction);
    executor.step(dispatchRebuiltInstruction);
    executor.step(dispatchRebuiltInstruction);
    expect(state.registers.read16(0)).toBe(2);
    expect(state.flags.has(1)).toBe(true);
    expect(state.readEip()).toBe(5);
  });

  it("routes immediate far CALL through the shared far-control executor", () => {
    const state = new RebuiltCpuState();
    state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false });
    state.writeEip(0);
    state.registers.write16(4, 0x100);
    const bytes = new Map<number, number>(
      [0x9a, 0x34, 0x12, 0x00, 0x20].map((value, index) => [index, value])
    );
    const executor = new RebuiltCpuExecutor(state, {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: (address, value) => bytes.set(address, value)
    });
    executor.step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({
      eip: 0x1234,
      segments: { cs: { selector: 0x2000 } },
      registers: { esp: 0xfc }
    });
  });

  it("wraps a valid LOCK memory RMW instruction in the bus atomic boundary", () => {
    const state = new RebuiltCpuState();
    state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    state.writeEip(0);
    state.registers.write8(0, 1);
    const bytes = new Map<number, number>([
      [0, 0xf0],
      [1, 0x00],
      [2, 0x06],
      [3, 0x10],
      [4, 0x00],
      [0x10, 2]
    ]);
    let atomic = 0;
    new RebuiltCpuExecutor(state, {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: (address, value) => bytes.set(address, value),
      runAtomically: (operation) => {
        atomic += 1;
        return operation();
      }
    }).step(dispatchRebuiltInstruction);
    expect(atomic).toBe(1);
    expect(bytes.get(0x10)).not.toBe(2);
  });

  it("delivers #UD for LOCK on an invalid register-only form", () => {
    const state = new RebuiltCpuState();
    state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false });
    state.writeEip(0);
    state.registers.write16(4, 0x100);
    const bytes = new Map<number, number>([
      [0, 0xf0],
      [1, 0x90],
      [0x18, 0x34],
      [0x19, 0x12],
      [0x1a, 0x00],
      [0x1b, 0x20]
    ]);
    new RebuiltCpuExecutor(state, {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: (address, value) => bytes.set(address, value)
    }).step(dispatchRebuiltInstruction);
    expect(state.snapshot()).toMatchObject({ eip: 0x1234, registers: { esp: 0xfa } });
    expect(bytes.get(0xfa)).toBe(0);
  });
});
