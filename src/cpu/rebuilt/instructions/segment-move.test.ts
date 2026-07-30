import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeLoadFarPointer, executeSegmentMove } from "./segment-move.js";

function execute(bytes: number[], setup?: (state: RebuiltCpuState, memory: Uint8Array) => void) {
  const state = new RebuiltCpuState();
  const memory = new Uint8Array(0x1000);
  memory.set(bytes);
  state.writeSegment("cs", {
    selector: 0,
    base: 0,
    limit: 0xffff_ffff,
    default32: false,
    valid: true
  });
  state.writeEip(0);
  setup?.(state, memory);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory[address]!,
    writeUint8: (address, value) => {
      memory[address] = value;
    }
  }).step(executeSegmentMove);
  return { state, memory };
}

describe("rebuilt segment MOV", () => {
  it("loads and stores real-mode segment selectors", () => {
    const loaded = execute([0x8e, 0xd8], (state) => state.registers.write16(0, 0x1234));
    expect(loaded.state.readSegment("ds")).toMatchObject({
      selector: 0x1234,
      base: 0x12340,
      valid: true
    });
    const stored = execute([0x8c, 0xd8], (state) =>
      state.writeSegment("ds", { selector: 0x4321, base: 0, limit: 0xffff, default32: false })
    );
    expect(stored.state.registers.read16(0)).toBe(0x4321);
  });

  it("loads a protected-mode GDT data descriptor and invalidates a null data selector", () => {
    const result = execute([0x8e, 0xd8], (state, memory) => {
      memory.set([0xff, 0xff, 0, 0, 0, 0x92, 0xcf, 0], 0x08);
      state.writeCr0(1);
      state.writeGdtr({ base: 0, limit: 0x1f });
      state.registers.write16(0, 0x08);
    });
    expect(result.state.readSegment("ds")).toMatchObject({
      base: 0,
      limit: 0xffff_ffff,
      default32: true,
      dpl: 0
    });
    const nullSegment = execute([0x8e, 0xd8], (state) => {
      state.writeCr0(1);
      state.registers.write16(0, 0);
    });
    expect(nullSegment.state.readSegment("ds").valid).toBe(false);
  });

  it("covers every legal segment-register encoding for MOV stores and loads", () => {
    for (const [index, segment] of [
      [0, "es"],
      [1, "cs"],
      [2, "ss"],
      [3, "ds"],
      [4, "fs"],
      [5, "gs"]
    ] as const) {
      const selector = 0x1000 + index;
      const stored = execute([0x8c, 0xc0 | (index << 3)], (state) =>
        state.writeSegment(segment, {
          selector,
          base: segment === "cs" ? 0 : selector << 4,
          limit: 0xffff,
          default32: false
        })
      );
      expect(stored.state.registers.read16(0)).toBe(selector);
    }

    for (const [index, segment] of [
      [0, "es"],
      [2, "ss"],
      [3, "ds"],
      [4, "fs"],
      [5, "gs"]
    ] as const) {
      const selector = 0x2000 + index;
      const loaded = execute([0x8e, 0xc0 | (index << 3)], (state) =>
        state.registers.write16(0, selector)
      );
      expect(loaded.state.readSegment(segment)).toMatchObject({
        selector,
        base: selector << 4,
        valid: true
      });
    }
  });

  it("delivers #UD for MOV CS and undefined segment encodings", () => {
    for (const modRm of [0xc8, 0xf0]) {
      const result = execute([0x8e, modRm], (state, memory) => {
        state.registers.write16(4, 0x100);
        memory.set([0x34, 0x12, 0, 0x20], 0x18);
      });
      expect([0x18, 0x19, 0x1a, 0x1b].map((address) => result.memory[address])).toEqual([
        0x34, 0x12, 0, 0x20
      ]);
      expect(result.state.snapshot()).toMatchObject({ eip: 0x1234, registers: { esp: 0xfa } });
    }
  });
});

describe("rebuilt LES and LDS", () => {
  it("loads a real-mode word far pointer", () => {
    const state = new RebuiltCpuState();
    const memory = new Uint8Array(0x1000);
    memory.set([0xc4, 0x06, 0x20, 0x00]);
    memory.set([0x34, 0x12, 0x00, 0x20], 0x20);
    state.writeSegment("cs", {
      selector: 0,
      base: 0,
      limit: 0xffff,
      default32: false,
      valid: true
    });
    state.writeEip(0);
    new RebuiltCpuExecutor(state, {
      readUint8: (address) => memory[address]!,
      writeUint8: () => undefined
    }).step(executeLoadFarPointer);
    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x1234 },
      segments: { es: { selector: 0x2000, base: 0x20000 } }
    });
  });

  it("loads a 66-selected dword LDS far pointer", () => {
    const state = new RebuiltCpuState();
    const memory = new Uint8Array(0x1000);
    memory.set([0x66, 0xc5, 0x06, 0x20, 0x00]);
    memory.set([0x78, 0x56, 0x34, 0x12, 0x00, 0x30], 0x20);
    state.writeSegment("cs", {
      selector: 0,
      base: 0,
      limit: 0xffff,
      default32: false,
      valid: true
    });
    state.writeEip(0);
    new RebuiltCpuExecutor(state, {
      readUint8: (address) => memory[address]!,
      writeUint8: () => undefined
    }).step(executeLoadFarPointer);
    expect(state.snapshot()).toMatchObject({
      registers: { eax: 0x12345678 },
      segments: { ds: { selector: 0x3000, base: 0x30000 } }
    });
  });

  it("loads default-32 LES and LDS far pointers through 32-bit addressing", () => {
    for (const [opcode, segment] of [
      [0xc4, "es"],
      [0xc5, "ds"]
    ] as const) {
      const state = new RebuiltCpuState();
      const memory = new Uint8Array(0x1000);
      memory.set([opcode, 0x05, 0x20, 0, 0, 0]);
      memory.set([0x78, 0x56, 0x34, 0x12, 0x00, 0x30], 0x20);
      state.writeSegment("cs", {
        selector: 0,
        base: 0,
        limit: 0xffff_ffff,
        default32: true,
        valid: true
      });
      state.writeEip(0);
      new RebuiltCpuExecutor(state, {
        readUint8: (address) => memory[address]!,
        writeUint8: () => undefined
      }).step(executeLoadFarPointer);
      expect(state.snapshot()).toMatchObject({
        eip: 6,
        registers: { eax: 0x1234_5678 },
        segments: { [segment]: { selector: 0x3000, base: 0x30000 } }
      });
    }
  });

  it("delivers #UD when LES or LDS uses a register ModR/M form", () => {
    for (const opcode of [0xc4, 0xc5]) {
      const state = new RebuiltCpuState();
      const memory = new Uint8Array(0x1000);
      memory.set([opcode, 0xc0]);
      memory.set([0x34, 0x12, 0, 0x20], 0x18);
      state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
      state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false });
      state.writeEip(0);
      state.registers.write16(4, 0x100);
      new RebuiltCpuExecutor(state, {
        readUint8: (address) => memory[address]!,
        writeUint8: () => undefined
      }).step(executeLoadFarPointer);
      expect(state.snapshot()).toMatchObject({ eip: 0x1234, registers: { esp: 0xfa } });
    }
  });
});
