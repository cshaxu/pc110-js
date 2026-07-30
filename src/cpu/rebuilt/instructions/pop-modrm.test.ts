import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executePopModRm } from "./pop-modrm.js";

function execute(
  bytes: readonly number[],
  setup: (state: RebuiltCpuState, memory: Map<number, number>) => void
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeEip(0);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  setup(state, memory);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(executePopModRm);
  return { state, memory };
}

describe("rebuilt POP r/m", () => {
  it("pops to register and memory with operand and address-size selection", () => {
    const register = execute([0x8f, 0xc0], (state, memory) => {
      state.registers.write16(4, 0x100);
      memory.set(0x100, 0x34);
      memory.set(0x101, 0x12);
    });
    expect(register.state.snapshot()).toMatchObject({
      registers: { eax: 0x1234, esp: 0x102 },
      eip: 2
    });

    const wide = execute([0x66, 0x67, 0x8f, 0x05, 0x10, 0, 0, 0], (state, memory) => {
      state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff_ffff, default32: true });
      state.registers.write32(4, 0x100);
      [0x78, 0x56, 0x34, 0x12].forEach((value, index) => memory.set(0x100 + index, value));
    });
    expect(wide.state.snapshot()).toMatchObject({ registers: { esp: 0x104 }, eip: 8 });
    expect([0x10, 0x11, 0x12, 0x13].map((address) => wide.memory.get(address))).toEqual([
      0x78, 0x56, 0x34, 0x12
    ]);
  });

  it("delivers #UD for nonzero 8F extensions", () => {
    const result = execute([0x8f, 0xc8], (state, memory) => {
      state.registers.write16(4, 0x100);
      [0x34, 0x12, 0, 0x20].forEach((value, index) => memory.set(0x18 + index, value));
    });
    expect(result.state.snapshot()).toMatchObject({ eip: 0x1234, registers: { esp: 0xfa } });
  });
});
