import { describe, expect, it } from "vitest";
import { NativeCoreCheckpoint } from "../app/native-core-checkpoint.js";
import { NativeLockstepAdapter } from "./native-lockstep-adapter.js";

describe("NativeLockstepAdapter", () => {
  it("reports normalized reset CPU state without presentation formatting", () => {
    const adapter = new NativeLockstepAdapter(new NativeCoreCheckpoint());

    expect(adapter.snapshot()).toMatchObject({
      version: 1,
      virtualCycles: "0",
      cpu: {
        eip: 0xfff0,
        eflags: 0x00000002,
        cr0: 0x7ffffff0,
        segments: { cs: { selector: 0xf000, base: 0xffff0000, valid: true } }
      },
      devices: {
        pic: { master: { mask: undefined, request: undefined, inService: undefined } },
        keyboardController: { status: 0x10, commandByte: 0x10, outputBuffer: undefined },
        rtc: { address: 0, statusA: 0x26, statusB: 0x02, statusC: 0, statusD: 0x80 }
      }
    });
  });

  it("reports one instruction and its charged virtual cycles", () => {
    const checkpoint = new NativeCoreCheckpoint();
    checkpoint.memory.writeUint8(0, 0x90);
    checkpoint.core.runner.state.writeSegment("cs", {
      selector: 0,
      base: 0,
      limit: 0xffff,
      default32: false,
      valid: true
    });
    checkpoint.core.runner.state.writeEip(0);
    const adapter = new NativeLockstepAdapter(checkpoint);
    const before = adapter.snapshot();

    const result = adapter.stepInstruction();
    const after = adapter.snapshot();

    expect(result.kind).toBe("instruction");
    expect(result.cycles).toBeGreaterThan(0);
    expect(after.virtualCycles).toBe(
      (BigInt(before.virtualCycles) + BigInt(result.cycles)).toString()
    );
    expect(after.cpu.eip).toBe(1);
  });

  it("does not disguise a halted CPU as an instruction boundary", () => {
    const checkpoint = new NativeCoreCheckpoint();
    checkpoint.core.runner.state.halt();
    const adapter = new NativeLockstepAdapter(checkpoint);

    expect(adapter.stepInstruction()).toEqual({ kind: "halted", cycles: 0 });
    expect(adapter.snapshot().virtualCycles).toBe("0");
  });
});
