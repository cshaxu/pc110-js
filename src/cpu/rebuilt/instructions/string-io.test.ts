import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeStringIo } from "./string-io.js";

function execute(
  bytes: readonly number[],
  setup: (state: RebuiltCpuState, memory: Map<number, number>) => void
) {
  const state = new RebuiltCpuState();
  state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeSegment("ds", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeSegment("es", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
  state.writeEip(0);
  const memory = new Map<number, number>(bytes.map((value, index) => [index, value]));
  setup(state, memory);
  const writes: Array<[number, number, number]> = [];
  new RebuiltCpuExecutor(
    state,
    {
      readUint8: (address) => memory.get(address) ?? 0,
      writeUint8: (address, value) => memory.set(address, value)
    },
    undefined,
    { read: () => 0xaabb_ccdd, write: (port, value, width) => writes.push([port, value, width]) }
  ).step(executeStringIo);
  return { state, memory, writes };
}

describe("rebuilt INS and OUTS", () => {
  it("writes INS data to ES:DI and applies DF", () => {
    const result = execute([0x6d], (state) => {
      state.registers.write16(2, 0x1234);
      state.registers.write16(7, 0x20);
      state.flags.set(0x400);
    });
    expect([result.memory.get(0x20), result.memory.get(0x21)]).toEqual([0xdd, 0xcc]);
    expect(result.state.registers.read16(7)).toBe(0x1e);
  });
  it("keeps EIP for a remaining REP OUTSB iteration", () => {
    const result = execute([0xf3, 0x6e], (state, memory) => {
      state.registers.write16(2, 0x80);
      state.registers.write16(6, 0x20);
      state.registers.write16(1, 2);
      memory.set(0x20, 0x5a);
    });
    expect(result.writes).toEqual([[0x80, 0x5a, 8]]);
    expect(result.state.snapshot()).toMatchObject({ eip: 0, registers: { ecx: 1, esi: 0x21 } });
  });
});
