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
      fdcPhase: "command",
      fdcMainStatus: "80",
      fdcInterruptPending: "0",
      fdcDmaBytesPending: "0",
      fdcDrive0Ready: "0",
      fdcDrive0Cylinder: "0",
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

  it("maps native system and VGA ROMs, then attaches selected raw floppy media", () => {
    const checkpoint = new NativeCoreCheckpoint();
    expect(checkpoint.core.deskProSecondaryPit).toBeDefined();
    const rom = new Uint8Array(0x8000);
    rom[0x7ff0] = 0xea;
    checkpoint.mapSystemRom(rom);
    expect(checkpoint.memory.readUint8(0xfffffff0)).toBe(0xea);
    expect(checkpoint.memory.readUint8(0xffff0)).toBe(0xea);

    const vgaRom = new Uint8Array(0x6000);
    vgaRom[0] = 0x55;
    vgaRom[1] = 0xaa;
    checkpoint.mapVgaRom(vgaRom);
    expect(checkpoint.memory.readUint8(0xc0000)).toBe(0x55);
    expect(checkpoint.memory.readUint8(0xc0001)).toBe(0xaa);

    checkpoint.attachFloppy(new Uint8Array(80 * 2 * 18 * 512));
    expect(checkpoint.core.fdc.controller.snapshot().drives[0]).toMatchObject({ ready: true });
    expect(checkpoint.snapshot()).toMatchObject({ fdcDrive0Ready: "1", fdcDrive0Cylinder: "0" });
  });

  it("models selected-machine expansion ROM holes as a floating physical bus", () => {
    const checkpoint = new NativeCoreCheckpoint();
    expect(checkpoint.memory.readUint8(0xe0000)).toBe(0xff);
    expect(() => checkpoint.memory.writeUint8(0xe0000, 0x12)).not.toThrow();
  });

  it("models selected-machine unpopulated I/O as floating reads and ignored writes", () => {
    const checkpoint = new NativeCoreCheckpoint();
    expect(checkpoint.core.ports.read(0x4b, 8)).toBe(0);
    expect(checkpoint.core.ports.read(0x4c, 8)).toBe(0xff);
    expect(() => checkpoint.core.ports.write(0x4c, 0x36, 8)).not.toThrow();
  });
});
