import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeImmediateModRmMove } from "./immediate-modrm-move.js";

function execute(
  bytes: readonly number[],
  setup?: (state: RebuiltCpuState, memory: Map<number, number>) => void
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeEip(0);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  setup?.(state, memory);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(executeImmediateModRmMove);
  return { state, memory };
}

describe("rebuilt C6/C7 immediate ModR/M MOV", () => {
  it("writes byte and word register destinations", () => {
    expect(execute([0xc6, 0xc1, 0xa5]).state.registers.read8(1)).toBe(0xa5);
    expect(execute([0xc7, 0xc3, 0x34, 0x12]).state.registers.read16(3)).toBe(0x1234);
  });

  it("uses 66, 67, and segment override for dword memory destinations", () => {
    const result = execute(
      [0x26, 0x66, 0x67, 0xc7, 0x05, 0x00, 0x10, 0x00, 0x00, 0x78, 0x56, 0x34, 0x12],
      (state) =>
        state.writeSegment("es", {
          selector: 0,
          base: 0x2000,
          limit: 0xffff_ffff,
          default32: false
        })
    );
    expect(result.memory.get(0x3000)).toBe(0x78);
    expect(result.memory.get(0x3003)).toBe(0x12);
    expect(result.state.readEip()).toBe(13);
  });

  it("keeps non-zero extensions visible until #UD delivery is rebuilt", () => {
    expect(() => execute([0xc6, 0xc8, 0])).toThrow("#UD delivery");
  });
});
