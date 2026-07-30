import { describe, expect, it } from "vitest";
import { RebuiltCpuExecutor } from "../execution.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { executeFlagControl } from "./flag-control.js";

describe("rebuilt flag-control instructions", () => {
  it("executes CMC, CLC, STC, CLD, and STD without changing unrelated flags", () => {
    [0xf5, 0xf8, 0xf9, 0xfc, 0xfd].forEach((opcode) => {
      const state = new RebuiltCpuState();
      state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff_ffff, default32: false });
      state.writeEip(0);
      state.flags.write(0x00000c03);
      new RebuiltCpuExecutor(state, { readUint8: () => opcode, writeUint8: () => undefined }).step(
        executeFlagControl
      );
      expect(state.readEip()).toBe(1);
      expect(state.flags.read() & 0x800).toBe(0x800);
    });
  });
});
