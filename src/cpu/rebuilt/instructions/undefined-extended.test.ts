import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "../dispatch.js";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";

function execute(opcode: number) {
  const state = new RebuiltCpuState();
  for (const segment of ["cs", "ds", "es", "ss", "fs", "gs"] as const)
    state.writeSegment(segment, { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeEip(0);
  const memory = new Map<number, number>([
    [0, 0x0f],
    [1, opcode],
    [0x18, 0x40]
  ]);
  new RebuiltCpuExecutor(state, {
    readUint8: (address) => memory.get(address) ?? 0,
    writeUint8: (address, value) => memory.set(address, value)
  }).step(dispatchRebuiltInstruction);
  return state;
}

describe("rebuilt NXVM undefined 0F extensions", () => {
  it("delivers vector 6 with the faulting EIP for every NXVM undefined extension", () => {
    const opcodes = [
      0x04,
      0x05,
      0x07,
      0x08,
      0x09,
      ...range(0x0a, 0x1f),
      0x25,
      ...range(0x27, 0x2f),
      ...range(0x30, 0x7f),
      0xa2,
      0xa6,
      0xa7,
      0xaa,
      0xae,
      0xb0,
      0xb1,
      ...range(0xc0, 0xff)
    ];
    for (const opcode of opcodes) expect(execute(opcode).readEip()).toBe(0x40);
  });
});

function range(first: number, last: number): number[] {
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}
