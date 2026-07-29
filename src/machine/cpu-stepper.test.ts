import { describe, expect, it } from "vitest";
import type { InstructionTraceEvent } from "../cpu/x86/execution.js";
import { Cpu386State } from "../cpu/x86/state.js";
import { CpuStepper } from "./cpu-stepper.js";

function resetAliasMemory(values: Map<number, number>) {
  return {
    readUint8: (address: number) =>
      values.get(address >= 0xffff0000 ? address & 0xfffff : address) ?? 0,
    writeUint8: (address: number, value: number) =>
      values.set(address >= 0xffff0000 ? address & 0xfffff : address, value & 0xff)
  };
}

describe("CPU stepper", () => {
  it("runs a bounded deterministic instruction sequence and forwards traces", () => {
    const values = new Map<number, number>([
      [0x000ffff0, 0x90],
      [0x000ffff1, 0xf4]
    ]);
    const events: InstructionTraceEvent[] = [];
    const cpu = new Cpu386State();
    const stepper = new CpuStepper(resetAliasMemory(values), cpu, undefined, (event) =>
      events.push(event)
    );

    expect(stepper.run(5)).toEqual({ executed: 2, halted: true });
    expect(cpu.snapshot().eip).toBe(0x0000fff2);
    expect(events).toHaveLength(2);
  });

  it("rejects an invalid instruction budget without executing", () => {
    const cpu = new Cpu386State();
    const stepper = new CpuStepper(resetAliasMemory(new Map()), cpu);

    expect(() => stepper.run(-1)).toThrow("Instruction budget");
    expect(cpu.snapshot().eip).toBe(0x0000fff0);
  });

  it("exposes the device-facing external interrupt service boundary", () => {
    const values = new Map<number, number>([
      [0x00000020, 0x00],
      [0x00000021, 0x10],
      [0x00000022, 0x00],
      [0x00000023, 0xf0]
    ]);
    const cpu = new Cpu386State();
    cpu.loadRealModeSegment("ss", 0);
    cpu.writeRegister16(4, 0x1000);
    cpu.setInterruptFlag();
    const stepper = new CpuStepper(resetAliasMemory(values), cpu);

    expect(stepper.serviceExternalInterrupt(0x08)).toBe(true);
    expect(cpu.snapshot()).toMatchObject({ eip: 0x1000, cs: { selector: 0xf000 } });
  });
});
