import { describe, expect, it } from "vitest";
import { RebuiltCpuState } from "./cpu-state.js";

describe("RebuiltCpuState", () => {
  it("creates an independent 80386 reset snapshot", () => {
    const state = new RebuiltCpuState();

    expect(state.snapshot()).toMatchObject({
      registers: { edx: 0x00000300 },
      eip: 0x0000fff0,
      eflags: 0x00000002,
      cr0: 0x7ffffff0,
      cr2: 0,
      cr3: 0,
      gdtr: { base: 0, limit: 0 },
      idtr: { base: 0, limit: 0x3ff },
      segments: { cs: { selector: 0xf000, base: 0xffff0000, limit: 0xffff, default32: false } }
    });
  });

  it("stores independent descriptor-table registers for protected-mode loading", () => {
    const state = new RebuiltCpuState();
    state.writeGdtr({ base: 0x0012_3000, limit: 0x0047 });
    state.writeIdtr({ base: 0x0045_6000, limit: 0x07ff });
    expect(state.readGdtr()).toEqual({ base: 0x0012_3000, limit: 0x0047 });
    expect(state.readIdtr()).toEqual({ base: 0x0045_6000, limit: 0x07ff });
  });

  it("tracks one succeeding instruction of maskable-interrupt inhibition", () => {
    const state = new RebuiltCpuState();
    state.inhibitMaskableInterruptsForNextInstruction();
    expect(state.maskableInterruptsInhibited()).toBe(true);
    state.completeInstructionBoundary();
    expect(state.maskableInterruptsInhibited()).toBe(true);
    state.completeInstructionBoundary();
    expect(state.maskableInterruptsInhibited()).toBe(false);
  });
});
