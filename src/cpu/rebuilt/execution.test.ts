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

  it("fetches instructions through rebuilt 80386 paging", () => {
    const state = new RebuiltCpuState();
    const bytes = new Map<number, number>();
    const write32 = (address: number, value: number) => {
      for (let index = 0; index < 4; index += 1)
        bytes.set(address + index, (value >>> (index * 8)) & 0xff);
    };
    state.writeCr0(0x80000001);
    state.writeCr3(0x1000);
    state.writeSegment("cs", { selector: 8, base: 0, limit: 0xffffffff, default32: true, dpl: 0 });
    state.writeEip(0);
    write32(0x1000, 0x2003);
    write32(0x2000, 0x3003);
    bytes.set(0x3000, 0x90);
    const executor = new RebuiltCpuExecutor(state, {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: (address, value) => bytes.set(address, value)
    });

    executor.step(({ instruction, state: active }) => {
      expect(instruction.opcode).toBe(0x90);
      active.advanceEip(instruction.length);
    });
    expect(state.readEip()).toBe(1);
  });
});
