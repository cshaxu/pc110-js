import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeWait } from "./wait.js";

function execute(taskSwitched: boolean) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
  state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false });
  state.writeEip(0);
  state.registers.write16(4, 0x100);
  state.writeCr0(taskSwitched ? 0x8 : 0);
  const memory = new Map<number, number>([
    [0, 0x9b],
    [0x1c, 0x34],
    [0x1d, 0x12],
    [0x1e, 0],
    [0x1f, 0x20]
  ]);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(executeWait);
  return { state, memory };
}

describe("rebuilt WAIT", () => {
  it("advances when CR0.TS is clear", () => expect(execute(false).state.readEip()).toBe(1));
  it("delivers #NM at the faulting EIP when CR0.TS is set", () => {
    const result = execute(true);
    expect(result.state.snapshot()).toMatchObject({ eip: 0x1234, registers: { esp: 0xfa } });
    expect(result.memory.get(0xfa)).toBe(0);
  });
});
