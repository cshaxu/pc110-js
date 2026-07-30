import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeXlat } from "./xlat.js";

function execute(
  bytes: readonly number[],
  setup?: (state: RebuiltCpuState, memory: Map<number, number>) => void,
  codeDefault32 = false
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: codeDefault32 });
  state.writeEip(0);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  setup?.(state, memory);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: () => undefined
  }).step(executeXlat);
  return state;
}

describe("rebuilt XLAT", () => {
  it("indexes DS through BX and AL with 16-bit wrap", () => {
    const state = execute([0xd7], (cpu, memory) => {
      cpu.registers.write16(3, 0xfffe);
      cpu.registers.write8(0, 3);
      memory.set(1, 0xa5);
    });
    expect(state.registers.read8(0)).toBe(0xa5);
  });
  it("uses 67 and a segment override for EBX addressing", () => {
    const state = execute([0x26, 0x67, 0xd7], (cpu, memory) => {
      cpu.writeSegment("es", { selector: 0, base: 0x2000, limit: 0xffff_ffff, default32: false });
      cpu.registers.write32(3, 0x1000);
      cpu.registers.write8(0, 2);
      memory.set(0x3002, 0x5a);
    });
    expect(state.registers.read8(0)).toBe(0x5a);
    expect(state.readEip()).toBe(3);
  });

  it("uses default-32 EBX addressing without an override", () => {
    const state = execute(
      [0xd7],
      (cpu, memory) => {
        cpu.registers.write32(3, 0x0001_0000);
        cpu.registers.write8(0, 2);
        memory.set(0x0001_0002, 0xa5);
      },
      true
    );
    expect(state.registers.read8(0)).toBe(0xa5);
    expect(state.readEip()).toBe(1);
  });
});
