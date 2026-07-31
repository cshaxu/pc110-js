import { describe, expect, it } from "vitest";
import { NativeCoreCheckpoint } from "./native-core-checkpoint.js";

describe("NativeCoreCheckpoint", () => {
  it("reports project-native CPU reset and uninitialized PIC state", () => {
    const checkpoint = new NativeCoreCheckpoint();
    expect(checkpoint.snapshot()).toEqual({
      codeAddress: "F000:FFF0",
      masterRequest: "--",
      masterInService: "--",
      masterMask: "--",
      slaveRequest: "--",
      slaveInService: "--",
      slaveMask: "--",
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
      keyboardControllerStatus: "10",
      keyboardControllerCommandByte: "10",
      keyboardControllerOutputBuffer: "--",
      keyboardControllerKeyboardEnabled: "0",
      keyboardScanningEnabled: "0",
      bdaKeyboardHead: "0000",
      bdaKeyboardTail: "0000",
      recentKeyboardControllerWrites: "--",
      keyboardControllerCommandByteTransitions: "--",
      recentKeyboardControllerPortEvents: "--",
      recentPortEvents: "--"
    });

    checkpoint.core.pic.master.raise(1);
    checkpoint.reset();
    expect(checkpoint.snapshot().masterRequest).toBe("--");
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

  it("models selected-machine expansion ROM holes as floating PCjs reads", () => {
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

  it("keeps the selected browser checkpoint on the generic 8042 interface-test result", () => {
    const checkpoint = new NativeCoreCheckpoint();

    checkpoint.core.ports.write(0x64, 0xab, 8);

    expect(checkpoint.core.ports.read(0x60, 8)).toBe(0x00);
  });

  it("retains a bounded native port-event tail without instruction snapshots", () => {
    const checkpoint = new NativeCoreCheckpoint({ portTrace: true });
    checkpoint.core.ports.write(0x64, 0xae, 8);
    checkpoint.core.ports.read(0x64, 8);

    expect(checkpoint.snapshot().recentPortEvents).toBe("W0064:AE R0064:18");
    expect(checkpoint.snapshot().recentKeyboardControllerWrites).toBe("W0064:AE");
    expect(checkpoint.snapshot().keyboardControllerCommandByteTransitions).toBe("0064:AE 10>00");
    expect(checkpoint.snapshot().recentKeyboardControllerPortEvents).toBe("W0064:AE R0064:18");
    checkpoint.reset();
    expect(checkpoint.snapshot().recentPortEvents).toBe("--");
    expect(checkpoint.snapshot().recentKeyboardControllerPortEvents).toBe("--");
    expect(checkpoint.snapshot().recentKeyboardControllerWrites).toBe("--");
    expect(checkpoint.snapshot().keyboardControllerCommandByteTransitions).toBe("--");
  });

  it("keeps Fast Execution free of port-tail formatting unless diagnostics enable it", () => {
    const checkpoint = new NativeCoreCheckpoint({ portTrace: false });
    checkpoint.core.ports.write(0x64, 0xae, 8);
    checkpoint.core.ports.read(0x64, 8);

    expect(checkpoint.snapshot()).toMatchObject({
      recentPortEvents: "--",
      recentKeyboardControllerWrites: "--",
      keyboardControllerCommandByteTransitions: "0064:AE 10>00",
      recentKeyboardControllerPortEvents: "--"
    });
  });

  it("reports BDA keyboard buffer pointers without changing their state", () => {
    const checkpoint = new NativeCoreCheckpoint();
    checkpoint.memory.writeUint8(0x41a, 0x1e);
    checkpoint.memory.writeUint8(0x41b, 0x00);
    checkpoint.memory.writeUint8(0x41c, 0x20);
    checkpoint.memory.writeUint8(0x41d, 0x00);

    expect(checkpoint.snapshot()).toMatchObject({
      bdaKeyboardHead: "001E",
      bdaKeyboardTail: "0020"
    });
  });
});
