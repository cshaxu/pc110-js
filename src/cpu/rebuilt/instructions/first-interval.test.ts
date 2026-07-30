import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { EFLAGS_CARRY, EFLAGS_ZERO } from "./arithmetic.js";
import { executeFirstIntervalArithmetic } from "./first-interval.js";

function execute(
  bytes: readonly number[],
  setup?: (state: RebuiltCpuState, memory: Map<number, number>) => void
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
  state.writeEip(0);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  setup?.(state, memory);
  const executor = new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  });
  executor.step(executeFirstIntervalArithmetic);
  return { state, memory };
}

describe("rebuilt 00-3D arithmetic forms", () => {
  it("covers r/m byte destination, register destination, and accumulator immediate ADD", () => {
    const rm = execute([0x00, 0xc8], (state) => {
      state.registers.write8(0, 1);
      state.registers.write8(1, 2);
    });
    expect(rm.state.registers.read8(0)).toBe(3);
    expect(rm.state.readEip()).toBe(2);

    const register = execute([0x03, 0xc1], (state) => {
      state.registers.write16(0, 1);
      state.registers.write16(1, 2);
    });
    expect(register.state.registers.read16(0)).toBe(3);

    const accumulator = execute([0x04, 0xff], (state) => state.registers.write8(0, 1));
    expect(accumulator.state.registers.read8(0)).toBe(0);
    expect(accumulator.state.flags.has(EFLAGS_CARRY | EFLAGS_ZERO)).toBe(true);
  });

  it("covers all operation categories and keeps CMP destination unchanged", () => {
    expect(
      execute([0x0c, 0x80], (state) => state.registers.write8(0, 0x01)).state.registers.read8(0)
    ).toBe(0x81);
    expect(
      execute([0x14, 0x01], (state) => {
        state.registers.write8(0, 1);
        state.flags.set(EFLAGS_CARRY);
      }).state.registers.read8(0)
    ).toBe(3);
    expect(
      execute([0x1c, 0x01], (state) => {
        state.registers.write8(0, 3);
        state.flags.set(EFLAGS_CARRY);
      }).state.registers.read8(0)
    ).toBe(1);
    expect(
      execute([0x24, 0x0f], (state) => state.registers.write8(0, 0xf0)).state.registers.read8(0)
    ).toBe(0);
    expect(
      execute([0x2c, 0x01], (state) => state.registers.write8(0, 3)).state.registers.read8(0)
    ).toBe(2);
    expect(
      execute([0x34, 0xff], (state) => state.registers.write8(0, 0x0f)).state.registers.read8(0)
    ).toBe(0xf0);
    const compared = execute([0x3c, 0x01], (state) => state.registers.write8(0, 1));
    expect(compared.state.registers.read8(0)).toBe(1);
    expect(compared.state.flags.has(EFLAGS_ZERO)).toBe(true);
  });

  it("uses 66, 67, and a segment override for independent dword memory arithmetic", () => {
    const result = execute([0x26, 0x66, 0x67, 0x01, 0x05, 0x00, 0x10, 0x00, 0x00], (state) => {
      state.writeSegment("es", { selector: 0, base: 0x2000, limit: 0xffff, default32: false });
      state.registers.write32(0, 1);
    });
    expect(result.memory.get(0x3000)).toBe(1);
    expect(result.memory.get(0x3003)).toBe(0);
    expect(result.state.readEip()).toBe(9);
  });

  it("implements DAA, DAS, AAA, and AAS without defining their undefined flags", () => {
    const daa = execute([0x27], (state) => state.registers.write8(0, 0x9b));
    expect(daa.state.registers.read8(0)).toBe(0x01);
    expect(daa.state.flags.has(EFLAGS_CARRY)).toBe(true);
    const das = execute([0x2f], (state) => state.registers.write8(0, 0x00));
    expect(das.state.registers.read8(0)).toBe(0);
    const aaa = execute([0x37], (state) => {
      state.registers.write8(0, 0x0b);
      state.registers.write8(4, 0x01);
    });
    expect(aaa.state.registers.read8(0)).toBe(1);
    expect(aaa.state.registers.read8(4)).toBe(2);
    const aas = execute([0x3f], (state) => {
      state.registers.write8(0, 0x0b);
      state.registers.write8(4, 0x02);
    });
    expect(aas.state.registers.read8(0)).toBe(5);
    expect(aas.state.registers.read8(4)).toBe(1);
  });

  it("pushes a real-mode segment selector through the SS stack boundary", () => {
    const pushed = execute([0x06], (state) => {
      state.writeSegment("es", {
        selector: 0x1234,
        base: 0x12340,
        limit: 0xffff,
        default32: false
      });
      state.registers.write16(4, 0x100);
    });
    expect(pushed.state.registers.read16(4)).toBe(0xfe);
    expect(pushed.memory.get(0xfe)).toBe(0x34);
    expect(pushed.memory.get(0xff)).toBe(0x12);
  });

  it("loads protected data and stack segments through POP selectors", () => {
    const data = execute([0x1f], (state, memory) => {
      state.writeCr0(1);
      state.writeGdtr({ base: 0x200, limit: 0x1f });
      state.writeSegment("cs", {
        selector: 8,
        base: 0,
        limit: 0xffff,
        default32: false,
        valid: true,
        dpl: 0
      });
      state.registers.write16(4, 0x100);
      memory.set(0x100, 0x08);
      memory.set(0x101, 0);
      [0xff, 0xff, 0, 0, 0, 0x92, 0x40, 0].forEach((value, index) =>
        memory.set(0x208 + index, value)
      );
    });
    expect(data.state.readSegment("ds")).toMatchObject({ selector: 8, limit: 0xffff, valid: true });
    expect(data.state.registers.read16(4)).toBe(0x102);

    const stack = execute([0x66, 0x17], (state, memory) => {
      state.writeCr0(1);
      state.writeGdtr({ base: 0x200, limit: 0x1f });
      state.writeSegment("cs", {
        selector: 8,
        base: 0,
        limit: 0xffff,
        default32: false,
        valid: true,
        dpl: 0
      });
      state.writeSegment("ss", {
        selector: 8,
        base: 0,
        limit: 0xffff_ffff,
        default32: true,
        valid: true,
        dpl: 0
      });
      state.registers.write32(4, 0x100);
      memory.set(0x100, 0x10);
      memory.set(0x101, 0);
      memory.set(0x102, 0);
      memory.set(0x103, 0);
      [0xff, 0xff, 0, 0, 0, 0x92, 0xcf, 0].forEach((value, index) =>
        memory.set(0x210 + index, value)
      );
    });
    expect(stack.state.readSegment("ss")).toMatchObject({ selector: 0x10, default32: true });
    expect(stack.state.registers.read32(4)).toBe(0x104);
    expect(stack.state.readEip()).toBe(2);
  });
});
