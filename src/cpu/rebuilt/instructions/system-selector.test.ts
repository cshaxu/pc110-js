import { describe, expect, it } from "vitest";
import { dispatchRebuiltInstruction } from "../dispatch.js";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";

function machine(bytes: number[]) {
  const state = new RebuiltCpuState();
  for (const segment of ["cs", "ds", "es", "ss", "fs", "gs"] as const)
    state.writeSegment(segment, { selector: 0, base: 0, limit: 0xffffffff, default32: false });
  state.writeEip(0);
  state.writeCr0(0x7ffffff1);
  const memory = new Map(bytes.map((value, index) => [index, value]));
  const executor = new RebuiltCpuExecutor(state, {
    readUint8: (a) => memory.get(a) ?? 0,
    writeUint8: (a, v) => memory.set(a, v)
  });
  return { state, memory, step: () => executor.step(dispatchRebuiltInstruction) };
}

describe("rebuilt 0F 00 selector group", () => {
  it("stores LDTR and TR selectors through operand-sized register destinations", () => {
    const ldt = machine([0x66, 0x0f, 0x00, 0xc0]);
    ldt.state.writeLdtr({ selector: 0x1234, base: 0, limit: 0, default32: false });
    ldt.step();
    expect(ldt.state.registers.read32(0)).toBe(0x1234);
    const tr = machine([0x0f, 0x00, 0xc8]);
    tr.state.writeTr({ selector: 0x5678, base: 0, limit: 0, default32: false });
    tr.step();
    expect(tr.state.registers.read16(0)).toBe(0x5678);
  });

  it("reports invalid VERR and VERW selectors through ZF without changing the selector source", () => {
    const verr = machine([0x0f, 0x00, 0xe0]);
    verr.state.registers.write16(0, 0);
    verr.state.flags.set(0x40);
    verr.step();
    expect(verr.state.flags.has(0x40)).toBe(false);
    const verw = machine([0x0f, 0x00, 0xe8]);
    verw.state.registers.write16(0, 0);
    verw.step();
    expect(verw.state.flags.has(0x40)).toBe(false);
  });
});
