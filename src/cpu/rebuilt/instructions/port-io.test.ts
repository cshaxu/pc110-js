import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "../dispatch.js";
import { RebuiltCpuExecutor } from "../execution.js";
import type { RebuiltPortBus } from "../io/port-bus.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executePortIo } from "./port-io.js";

function execute(
  bytes: readonly number[],
  io: RebuiltPortBus,
  setup?: (state: RebuiltCpuState) => void
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeEip(0);
  setup?.(state);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  new RebuiltCpuExecutor(
    state,
    { readUint8: (address) => memory.get(address) ?? 0, writeUint8: () => undefined },
    undefined,
    io
  ).step(executePortIo);
  return state;
}

describe("rebuilt port I/O", () => {
  it("executes immediate byte IN and OUT with an 8-bit accumulator", () => {
    const writes: Array<[number, number, number]> = [];
    const io: RebuiltPortBus = {
      read: (port, width) => (port === 0x80 && width === 8 ? 0xa5 : 0),
      write: (port, value, width) => writes.push([port, value, width])
    };
    const input = execute([0xe4, 0x80], io);
    expect(input.registers.read8(0)).toBe(0xa5);
    expect(input.readEip()).toBe(2);
    const output = execute([0xe6, 0x84], io, (state) => state.registers.write8(0, 0x5a));
    expect(writes).toEqual([[0x84, 0x5a, 8]]);
    expect(output.readEip()).toBe(2);
  });

  it("selects operand width and DX ports for word and dword forms", () => {
    const accesses: Array<[string, number, number, number]> = [];
    const io: RebuiltPortBus = {
      read: (port, width) => {
        accesses.push(["read", port, 0, width]);
        return width === 32 ? 0x12345678 : 0xbeef;
      },
      write: (port, value, width) => accesses.push(["write", port, value, width])
    };
    const input = execute([0x66, 0xed], io, (state) => state.registers.write16(2, 0x1234));
    expect(input.registers.read32(0)).toBe(0x12345678);
    const output = execute([0xef], io, (state) => {
      state.registers.write16(2, 0x5678);
      state.registers.write16(0, 0xcafe);
    });
    expect(output.readEip()).toBe(1);
    expect(accesses).toEqual([
      ["read", 0x1234, 0, 32],
      ["write", 0x5678, 0xcafe, 16]
    ]);
  });

  it("uses the CS default operand width when no 66 prefix is present", () => {
    const accesses: Array<[number, number]> = [];
    const io: RebuiltPortBus = {
      read: (_port, width) => {
        accesses.push([0, width]);
        return 0x76543210;
      },
      write: (_port, _value, width) => accesses.push([1, width])
    };
    const state = execute([0xed], io, (cpu) => {
      cpu.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: true });
      cpu.registers.write16(2, 0x1234);
    });
    expect(state.registers.read32(0)).toBe(0x76543210);
    expect(accesses).toEqual([[0, 32]]);
  });

  it("preserves fault EIP when no I/O boundary is supplied", () => {
    const state = new RebuiltCpuState();
    state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
    state.writeEip(0);
    expect(() =>
      new RebuiltCpuExecutor(state, { readUint8: () => 0xe6, writeUint8: () => undefined }).step(
        executePortIo
      )
    ).toThrow("Rebuilt I/O bus is unavailable");
    expect(state.readEip()).toBe(0);
  });

  it("delivers #GP(0) instead of accessing a port denied by protected I/O admission", () => {
    const writes: Array<[number, number, number]> = [];
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
    state.writeEip(0);
    state.registers.write32(4, 0x100);
    const memory = new Map<number, number>([
      [0, 0xe6],
      [1, 0x80]
    ]);
    [0xff, 0xff, 0, 0, 0, 0xfa, 0xcf, 0].forEach((value, index) =>
      memory.set(0x218 + index, value)
    );
    [0x60, 0, 0x18, 0, 0, 0xee, 0, 0].forEach((value, index) => memory.set(0x368 + index, value));
    new RebuiltCpuExecutor(
      state,
      {
        readUint8: (address) => memory.get(address) ?? 0,
        writeUint8: (address, value) => memory.set(address, value)
      },
      undefined,
      { read: () => 0, write: (port, value, width) => writes.push([port, value, width]) }
    ).step(dispatchRebuiltInstruction);

    expect(writes).toEqual([]);
    expect(state.snapshot()).toMatchObject({ eip: 0x60, registers: { esp: 0xf0 } });
    expect(memory.get(0xf0)).toBe(0);
  });
});
