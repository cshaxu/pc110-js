import { describe, expect, it } from "vitest";
import { NativeCoreCheckpoint } from "./native-core-checkpoint.js";

describe("NativeCoreCheckpoint", () => {
  it("reports project-native CPU reset and PIC register state", () => {
    const checkpoint = new NativeCoreCheckpoint();
    expect(checkpoint.snapshot()).toEqual({
      codeAddress: "F000:FFF0",
      masterRequest: "00",
      masterInService: "00",
      slaveRequest: "00",
      slaveInService: "00",
      timer0Output: "0",
      timer2Output: "0",
      dma0Masks: "0F",
      dma1Masks: "0F"
    });

    checkpoint.core.pic.master.raise(1);
    checkpoint.reset();
    expect(checkpoint.snapshot().masterRequest).toBe("00");
  });
});
