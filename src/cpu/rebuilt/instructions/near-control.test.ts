import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeNearControl } from "./near-control.js";

function execute(
  bytes: readonly number[],
  setup?: (state: RebuiltCpuState, memory: Map<number, number>) => void
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeEip(0);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  setup?.(state, memory);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(executeNearControl);
  return { state, memory };
}

describe("rebuilt near CALL and JMP", () => {
  it("executes near and short JMP relative offsets", () => {
    expect(execute([0xe9, 0x02, 0x00]).state.readEip()).toBe(5);
    expect(execute([0xeb, 0xfc]).state.readEip()).toBe(0xfffe);
  });
  it("pushes fallthrough for CALL with independent 32-bit SS addressing", () => {
    const result = execute([0x66, 0xe8, 0x02, 0x00, 0x00, 0x00], (cpu) => {
      cpu.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff_ffff, default32: true });
      cpu.registers.write32(4, 0x100);
    });
    expect(result.state.readEip()).toBe(8);
    expect(result.state.registers.read32(4)).toBe(0xfc);
    expect(result.memory.get(0xfc)).toBe(6);
  });

  it("loads the real-mode far immediate target from EA", () => {
    const result = execute([0xea, 0x05, 0xf9, 0x00, 0xf0]);
    expect(result.state.snapshot()).toMatchObject({
      eip: 0xf905,
      segments: { cs: { selector: 0xf000, base: 0x000f0000, limit: 0xffff, default32: false } }
    });
  });

  it("uses the operand-size-selected offset width for a far immediate JMP", () => {
    const result = execute([0x66, 0xea, 0x78, 0x56, 0x34, 0x12, 0x00, 0xf0]);
    expect(result.state.snapshot()).toMatchObject({
      eip: 0x12345678,
      segments: { cs: { selector: 0xf000, base: 0x000f0000, default32: false } }
    });
  });

  it("retains the fault EIP when protected-mode far JMP validation is unavailable", () => {
    const state = new RebuiltCpuState();
    state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
    state.writeCr0(0x1);
    state.writeEip(0);
    const memory = new Map<number, number>(
      [0xea, 0x00, 0x00, 0x08, 0x00].map((value, index) => [index, value])
    );
    expect(() =>
      new RebuiltCpuExecutor(state, {
        readUint8: (address) => memory.get(address) ?? 0,
        writeUint8: (address, value) => memory.set(address, value)
      }).step(executeNearControl)
    ).toThrow("Rebuilt protected-mode far JMP selector validation is not implemented");
    expect(state.readEip()).toBe(0);
  });
});
