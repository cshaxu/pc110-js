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
      dma1Masks: "0F",
      rtcStatusA: "26",
      rtcStatusB: "02",
      rtcStatusC: "00",
      rtcStatusD: "80",
      rtcNmiDisabled: "0",
      systemPortControl: "00",
      systemTimer2Gate: "0",
      systemSpeakerOutput: "0",
      a20Enabled: "1",
      keyboardControllerStatus: "00",
      keyboardControllerCommandByte: "10",
      keyboardControllerOutputBuffer: "--",
      keyboardControllerKeyboardEnabled: "0"
    });

    checkpoint.core.pic.master.raise(1);
    checkpoint.reset();
    expect(checkpoint.snapshot().masterRequest).toBe("00");
  });

  it("maps native system ROM aliases and attaches selected raw floppy media", () => {
    const checkpoint = new NativeCoreCheckpoint();
    const rom = new Uint8Array(0x8000);
    rom[0x7ff0] = 0xea;
    checkpoint.mapSystemRom(rom);
    expect(checkpoint.memory.readUint8(0xfffffff0)).toBe(0xea);
    expect(checkpoint.memory.readUint8(0xffff0)).toBe(0xea);

    checkpoint.attachFloppy(new Uint8Array(80 * 2 * 18 * 512));
    expect(checkpoint.core.fdc.controller.snapshot().drives[0]).toMatchObject({ ready: true });
  });
});
