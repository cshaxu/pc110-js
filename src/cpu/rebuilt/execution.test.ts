import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "./execution.js";
import { RebuiltCpuState } from "./state/cpu-state.js";

describe("RebuiltCpuExecutor", () => {
  it("fetches from reset CS:EIP and preserves instruction-start EIP for dispatch", () => {
    const state = new RebuiltCpuState();
    const bytes = new Map<number, number>([[0xfffffff0, 0x90]]);
    const executor = new RebuiltCpuExecutor(state, {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: (address, value) => {
        bytes.set(address, value);
      }
    });

    executor.step(({ instruction, state: active }) => {
      expect(instruction).toMatchObject({ startEip: 0xfff0, opcode: 0x90 });
      active.advanceEip(instruction.length);
    });

    expect(state.readEip()).toBe(0xfff1);
  });
});
