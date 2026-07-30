import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "../dispatch.js";
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

  it("executes every 00-3D ALU opcode form with register and immediate operands", () => {
    const operations = [
      { base: 0x00, left: 1, right: 2, expected: 3, compare: false, carry: false },
      { base: 0x08, left: 0xf0, right: 0x0f, expected: 0xff, compare: false, carry: false },
      { base: 0x10, left: 1, right: 2, expected: 4, compare: false, carry: true },
      { base: 0x18, left: 5, right: 2, expected: 2, compare: false, carry: true },
      { base: 0x20, left: 0xf0, right: 0x0f, expected: 0, compare: false, carry: false },
      { base: 0x28, left: 5, right: 2, expected: 3, compare: false, carry: false },
      { base: 0x30, left: 0xf0, right: 0x0f, expected: 0xff, compare: false, carry: false },
      { base: 0x38, left: 5, right: 2, expected: 5, compare: true, carry: false }
    ] as const;
    for (const operation of operations) {
      for (const form of [0, 1, 2, 3, 4, 5]) {
        const width = form === 0 || form === 2 || form === 4 ? 8 : 16;
        const immediate = form === 4 || form === 5;
        const encoded = immediate
          ? [operation.base + form, operation.right & 0xff, ...(width === 16 ? [0] : [])]
          : [operation.base + form, form < 2 ? 0xc8 : 0xc1];
        const result = execute(encoded, (state) => {
          if (operation.carry) state.flags.set(EFLAGS_CARRY);
          if (width === 8) {
            state.registers.write8(0, operation.left);
            state.registers.write8(1, operation.right);
          } else {
            state.registers.write16(0, operation.left);
            state.registers.write16(1, operation.right);
          }
        });
        const value =
          width === 8 ? result.state.registers.read8(0) : result.state.registers.read16(0);
        expect(value, `opcode ${encoded[0].toString(16)}`).toBe(operation.expected);
        expect(result.state.readEip()).toBe(encoded.length);
        expect(result.state.flags.has(EFLAGS_CARRY)).toBe(false);
        if (operation.compare) expect(result.state.flags.has(EFLAGS_ZERO)).toBe(false);
      }
    }
  });

  it("executes every ALU family through default-32 memory, 66, and 67 forms", () => {
    const operations = [
      { base: 0x00, left: 1, right: 2, expected: 3, carry: false },
      { base: 0x08, left: 0xf0, right: 0x0f, expected: 0xff, carry: false },
      { base: 0x10, left: 1, right: 2, expected: 4, carry: true },
      { base: 0x18, left: 5, right: 2, expected: 2, carry: true },
      { base: 0x20, left: 0xf0, right: 0x0f, expected: 0, carry: false },
      { base: 0x28, left: 5, right: 2, expected: 3, carry: false },
      { base: 0x30, left: 0xf0, right: 0x0f, expected: 0xff, carry: false },
      { base: 0x38, left: 5, right: 2, expected: 5, carry: false }
    ] as const;
    const forms: readonly (readonly [readonly number[], number])[] = [
      [[], 1],
      [[], 3],
      [[], 5],
      [[0x66], 1],
      [[0x67], 1]
    ];
    for (const operation of operations) {
      for (const [prefixes, form] of forms) {
        const memoryOperand = form === 1 || form === 3;
        const address16 = prefixes.includes(0x67);
        const bytes = memoryOperand
          ? [
              ...prefixes,
              operation.base + form,
              address16 ? 0x06 : 0x05,
              ...(address16 ? [0, 0x10] : [0, 0x10, 0, 0])
            ]
          : [...prefixes, operation.base + form, operation.right, 0, 0, 0];
        const result = execute(bytes, (state, memory) => {
          state.writeSegment("cs", { selector: 8, base: 0, limit: 0xffff_ffff, default32: true });
          if (operation.carry) state.flags.set(EFLAGS_CARRY);
          const width = prefixes.includes(0x66) ? 16 : 32;
          const write =
            width === 16
              ? state.registers.write16.bind(state.registers)
              : state.registers.write32.bind(state.registers);
          const put = (address: number, value: number) => {
            [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, value >>> 24].forEach(
              (byte, index) => memory.set(address + index, byte)
            );
          };
          if (form === 1) {
            write(0, operation.right);
            put(0x1000, operation.left);
          } else if (form === 3) {
            write(0, operation.left);
            put(0x1000, operation.right);
          } else write(0, operation.left);
        });
        const expected = operation.base === 0x38 ? operation.left : operation.expected;
        if (form === 1) {
          const value =
            result.memory.get(0x1000)! |
            (result.memory.get(0x1001)! << 8) |
            (result.memory.get(0x1002)! << 16) |
            (result.memory.get(0x1003)! << 24);
          expect(value >>> 0, `opcode ${operation.base.toString(16)} form ${form}`).toBe(expected);
        } else {
          const value = prefixes.includes(0x66)
            ? result.state.registers.read16(0)
            : result.state.registers.read32(0);
          expect(value, `opcode ${operation.base.toString(16)} form ${form}`).toBe(expected);
        }
      }
    }
  });

  it("uses default-32 and address-size override forms for XOR and CMP memory operands", () => {
    const xor = execute([0x67, 0x31, 0x06, 0x00, 0x10], (state, memory) => {
      state.writeSegment("cs", { selector: 8, base: 0, limit: 0xffffffff, default32: true });
      state.registers.write32(0, 0x00ff00ff);
      [0x0f, 0x0f, 0x0f, 0x0f].forEach((value, index) => memory.set(0x1000 + index, value));
    });
    expect([0, 1, 2, 3].map((index) => xor.memory.get(0x1000 + index))).toEqual([
      0xf0, 0x0f, 0xf0, 0x0f
    ]);
    expect(xor.state.readEip()).toBe(5);

    const cmp = execute([0x66, 0x67, 0x3b, 0x05, 0x00, 0x10, 0x00, 0x00], (state, memory) => {
      state.registers.write32(0, 0x01020304);
      [4, 3, 2, 1].forEach((value, index) => memory.set(0x1000 + index, value));
    });
    expect(cmp.state.registers.read32(0)).toBe(0x01020304);
    expect(cmp.state.flags.has(EFLAGS_ZERO)).toBe(true);
    expect(cmp.state.readEip()).toBe(8);
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

  it("uses the adjusted AL and current carry for DAS high-digit adjustment", () => {
    const das = execute([0x2f], (state) => {
      state.registers.write8(0, 0x9a);
      state.flags.set(0x10);
    });
    expect(das.state.registers.read8(0)).toBe(0x94);
    expect(das.state.flags.has(EFLAGS_CARRY)).toBe(false);
    expect(das.state.flags.has(0x10)).toBe(true);
  });

  it("executes every decimal and ASCII adjust form in virtual-8086 mode", () => {
    for (const [opcode, al, ah, expectedAl] of [
      [0x27, 0x9b, 0, 0x01],
      [0x2f, 0x00, 0, 0x00],
      [0x37, 0x0b, 1, 0x01],
      [0x3f, 0x0b, 2, 0x05]
    ] as const) {
      const result = execute([opcode], (state) => {
        state.writeCr0(1);
        state.flags.write(0x00020000);
        state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false, dpl: 3 });
        state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false, dpl: 3 });
        state.registers.write8(0, al);
        state.registers.write8(4, ah);
      });
      expect(result.state.registers.read8(0), `opcode ${opcode.toString(16)}`).toBe(expectedAl);
      expect(result.state.readEip()).toBe(1);
    }
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

  it("pushes and pops every 00-3F segment-stack form with v86 compatibility", () => {
    for (const [opcode, segment, selector] of [
      [0x06, "es", 0x1111],
      [0x0e, "cs", 0x2222],
      [0x16, "ss", 0x3333],
      [0x1e, "ds", 0x4444]
    ] as const) {
      const result = execute([opcode], (state) => {
        state.registers.write16(4, 0x100);
        state.writeSegment(segment, { selector, base: 0, limit: 0xffff, default32: false });
      });
      expect(result.state.registers.read16(4)).toBe(0xfe);
      expect(result.memory.get(0xfe)! | (result.memory.get(0xff)! << 8)).toBe(selector);
    }
    for (const [opcode, segment] of [
      [0x07, "es"],
      [0x17, "ss"],
      [0x1f, "ds"]
    ] as const) {
      const result = execute([opcode], (state, memory) => {
        state.writeCr0(1);
        state.flags.write(0x00020000);
        state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false, dpl: 3 });
        state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false, dpl: 3 });
        state.registers.write16(4, 0x100);
        memory.set(0x100, 0x34);
        memory.set(0x101, 0x12);
      });
      expect(result.state.readSegment(segment)).toMatchObject({
        selector: 0x1234,
        base: 0x12340,
        dpl: 3,
        valid: true
      });
      expect(result.state.registers.read16(4)).toBe(0x102);
    }
  });

  it("delivers protected segment-stack selector faults through #NP and #GP frames", () => {
    for (const [opcode, selector, vector, descriptor] of [
      [0x1f, 0x18, 11, [0xff, 0xff, 0, 0, 0, 0x12, 0xcf, 0]],
      [0x17, 0, 13, undefined]
    ] as const) {
      const state = new RebuiltCpuState();
      state.writeCr0(1);
      state.writeSegment("cs", { selector: 8, base: 0, limit: 0xffff, default32: false, dpl: 0 });
      state.writeSegment("ss", {
        selector: 0x10,
        base: 0,
        limit: 0xffff_ffff,
        default32: true,
        dpl: 0
      });
      state.writeGdtr({ base: 0x200, limit: 0x27 });
      state.writeIdtr({ base: 0x300, limit: 0x7f });
      state.writeEip(0);
      state.registers.write32(4, 0x100);
      const memory = new Map<number, number>();
      memory.set(0, opcode);
      memory.set(0x100, selector & 0xff);
      memory.set(0x101, selector >> 8);
      [0xff, 0xff, 0, 0, 0, 0x9a, 0xcf, 0].forEach((value, index) =>
        memory.set(0x208 + index, value)
      );
      [0xff, 0xff, 0, 0, 0, 0x92, 0xcf, 0].forEach((value, index) =>
        memory.set(0x210 + index, value)
      );
      descriptor?.forEach((value, index) => memory.set(0x218 + index, value));
      [0x60, 0, 8, 0, 0, 0x8e, 0, 0].forEach((value, index) =>
        memory.set(0x300 + vector * 8 + index, value)
      );

      new RebuiltCpuExecutor(state, {
        readUint8: (address) => memory.get(address) ?? 0,
        writeUint8: (address, value) => memory.set(address, value)
      }).step(dispatchRebuiltInstruction);

      expect(state.snapshot()).toMatchObject({ eip: 0x60, segments: { cs: { selector: 8 } } });
    }
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
