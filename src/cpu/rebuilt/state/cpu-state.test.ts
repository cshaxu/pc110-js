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
      segments: { cs: { selector: 0xf000, base: 0xffff0000, limit: 0xffff, default32: false } }
    });
  });
});
