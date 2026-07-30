import { describe, expect, it } from "vitest";
import { FDC_DOR_ENABLE, FDC_DOR_INTERRUPT_ENABLE, Fdc765 } from "./fdc765.js";
import { FloppyDrive } from "./floppy-drive.js";

function enable(controller: Fdc765, interrupts = true): void {
  controller.writeDor(FDC_DOR_ENABLE | (interrupts ? FDC_DOR_INTERRUPT_ENABLE : 0));
  while (controller.snapshot().interruptPending) {
    controller.writeData(0x08);
    controller.readData();
    controller.readData();
  }
}

describe("project-native 765/8272 controller state", () => {
  it("exposes the selected data-rate byte clocks", () => {
    const controller = new Fdc765();
    expect(controller.dmaBytesPerSecond()).toBe(62_500);
    controller.writeControl(0x01);
    expect(controller.dmaBytesPerSecond()).toBe(31_250);
    controller.writeControl(0x02);
    expect(controller.dmaBytesPerSecond()).toBe(37_500);
    controller.writeControl(0x03);
    expect(controller.dmaBytesPerSecond()).toBe(0);
  });

  it("resets through DOR and exposes four reset completion senses after enable", () => {
    const controller = new Fdc765();
    expect(controller.writeDor(FDC_DOR_ENABLE | FDC_DOR_INTERRUPT_ENABLE)).toMatchObject({
      accepted: true,
      irqRequested: true
    });
    for (let drive = 0; drive < 4; drive += 1) {
      expect(controller.writeData(0x08)).toMatchObject({ accepted: true });
      expect(controller.readData()).toBe(0xc0 | drive);
      expect(controller.readData()).toBe(0);
    }
    expect(controller.snapshot().interruptPending).toBe(false);
    controller.writeDor(0);
    expect(controller.snapshot()).toMatchObject({ phase: "command", interruptPending: false });
  });

  it("collects SPECIFY and returns command-phase status without an IRQ", () => {
    const controller = new Fdc765();
    enable(controller);
    controller.writeData(0x03);
    controller.writeData(0xdf);
    expect(controller.writeData(0x01)).toEqual({
      accepted: true,
      irqRequested: false,
      irqCleared: false
    });
    expect(controller.snapshot()).toMatchObject({ phase: "command", nonDma: true });
    expect(controller.readMainStatus()).toBe(0xa0);
  });

  it("reports selected drive state and seek/recalibrate completion through SENSE INTERRUPT", () => {
    const controller = new Fdc765();
    enable(controller);
    controller.setDriveReady(1, true);
    controller.writeData(0x04);
    expect(controller.writeData(0x05)).toMatchObject({ accepted: true });
    expect(controller.readData()).toBe(0x35);
    expect(controller.writeData(0x0f)).toMatchObject({ accepted: true });
    controller.writeData(0x01);
    expect(controller.writeData(0x12)).toMatchObject({ irqRequested: true });
    expect(controller.writeData(0x08)).toMatchObject({ irqCleared: true });
    expect(controller.readData()).toBe(0x21);
    expect(controller.readData()).toBe(0x12);
    controller.writeData(0x07);
    expect(controller.writeData(0x01)).toMatchObject({ irqRequested: true });
    controller.writeData(0x08);
    expect(controller.readData()).toBe(0x31);
    expect(controller.readData()).toBe(0);
  });

  it("returns an explicit invalid-command result without fabricating media data", () => {
    const controller = new Fdc765();
    enable(controller);
    expect(controller.writeData(0xff)).toMatchObject({ accepted: true, irqRequested: true });
    expect(controller.readMainStatus()).toBe(0xd0);
    expect(controller.readData()).toBe(0x80);
    expect(controller.snapshot().phase).toBe("command");
    controller.writeData(0x06);
    for (let index = 0; index < 8; index += 1) controller.writeData(0);
    expect(controller.readData()).toBe(0x80);
  });

  it("keeps disabled-controller data writes outside the command path", () => {
    const controller = new Fdc765();
    expect(controller.writeData(0x03)).toEqual({
      accepted: false,
      irqRequested: false,
      irqCleared: false
    });
    expect(controller.readMainStatus()).toBe(0x80);
    expect(controller.readInput()).toBe(0x80);
  });

  it("returns a real CHRN for READ ID and streams raw READ DATA bytes through execution", () => {
    const controller = new Fdc765();
    const drive = new FloppyDrive({
      cylinders: 1,
      heads: 1,
      sectorsPerTrack: 1,
      bytesPerSector: 128
    });
    drive.attach(Uint8Array.from({ length: 128 }, (_, index) => index));
    controller.attachDrive(0, drive);
    enable(controller);

    controller.writeData(0x0a);
    expect(controller.writeData(0x00)).toMatchObject({ irqRequested: true });
    expect([controller.readData(), controller.readData(), controller.readData()]).toEqual([
      0, 0, 0
    ]);
    expect([
      controller.readData(),
      controller.readData(),
      controller.readData(),
      controller.readData()
    ]).toEqual([0, 0, 1, 0]);

    for (const byte of [0x06, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00])
      controller.writeData(byte);
    expect(controller.snapshot()).toMatchObject({ phase: "execution", dmaBytesPending: 128 });
    expect(controller.readMainStatus()).toBe(0x90);
    expect([controller.readDmaByte(), controller.readDmaByte(), controller.readDmaByte()]).toEqual([
      0, 1, 2
    ]);
    while (controller.snapshot().dmaBytesPending > 0) controller.readDmaByte();
    expect(controller.completeDma(true)).toMatchObject({ accepted: true, irqRequested: true });
    expect(controller.snapshot().phase).toBe("result");
    expect(Array.from({ length: 7 }, () => controller.readData())).toEqual([0, 0, 0, 0, 0, 1, 0]);
  });
});
