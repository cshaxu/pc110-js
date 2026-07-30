import { describe, expect, it } from "vitest";
import {
  ATC_CYLINDER_HIGH_PORT,
  ATC_CYLINDER_LOW_PORT,
  ATC_DEVICE_CONTROL_PORT,
  ATC_DRIVE_HEAD_PORT,
  ATC_ERROR_PORT,
  ATC_SECTOR_NUMBER_PORT,
  ATC_STATUS_PORT,
  AtFixedDiskController
} from "./at-fixed-disk-controller.js";
import { FixedDrive } from "./fixed-drive.js";

function attachedController(interrupts: boolean[] = []): AtFixedDiskController {
  const controller = new AtFixedDiskController((active) => interrupts.push(active));
  const drive = new FixedDrive({ cylinders: 2, heads: 2, sectorsPerTrack: 3, bytesPerSector: 4 });
  drive.attach(new Uint8Array(48));
  controller.attachDrive(0, drive);
  return controller;
}

describe("primary AT fixed-disk controller", () => {
  it("owns the complete primary register family with correct width boundaries", () => {
    const controller = attachedController();
    controller.write(ATC_SECTOR_NUMBER_PORT, 2, 8);
    controller.write(ATC_CYLINDER_LOW_PORT, 1, 8);
    controller.write(ATC_CYLINDER_HIGH_PORT, 0, 8);
    controller.write(ATC_DRIVE_HEAD_PORT, 1, 8);
    expect(controller.read(ATC_SECTOR_NUMBER_PORT, 8)).toBe(2);
    expect(controller.read(ATC_CYLINDER_LOW_PORT, 8)).toBe(1);
    expect(controller.read(ATC_DRIVE_HEAD_PORT, 8)).toBe(0xa1);
    expect(controller.read(0x1f0, 16)).toBe(0xffff);
    expect(() => controller.read(ATC_STATUS_PORT, 16)).toThrow("8-bit");
    expect(() => controller.write(ATC_DEVICE_CONTROL_PORT, 0, 16)).toThrow("8-bit");
  });

  it("handles reset, selection, recalibrate, seek, and read verify with status and IRQ", () => {
    const interrupts: boolean[] = [];
    const controller = attachedController(interrupts);
    expect(controller.snapshot().status).toBe(0x50);
    controller.write(ATC_CYLINDER_LOW_PORT, 1, 8);
    controller.write(ATC_DRIVE_HEAD_PORT, 1, 8);
    controller.write(ATC_STATUS_PORT, 0x70, 8);
    expect(controller.snapshot()).toMatchObject({ status: 0x50, interruptActive: true });
    expect(controller.read(ATC_STATUS_PORT, 8)).toBe(0x50);
    expect(controller.snapshot().interruptActive).toBe(false);
    controller.write(ATC_STATUS_PORT, 0x10, 8);
    expect(controller.snapshot().cylinder).toBe(0);
    controller.write(ATC_SECTOR_NUMBER_PORT, 3, 8);
    controller.write(ATC_STATUS_PORT, 0x40, 8);
    expect(controller.read(ATC_STATUS_PORT, 8)).toBe(0x50);
    expect(interrupts).toContain(true);
  });

  it("reports no-media and invalid-CHS errors without fabricating data", () => {
    const absent = new AtFixedDiskController();
    absent.write(ATC_STATUS_PORT, 0x20, 8);
    expect(absent.read(ATC_STATUS_PORT, 8)).toBe(0x01);
    expect(absent.read(ATC_ERROR_PORT, 8)).toBe(0x04);

    const controller = attachedController();
    controller.write(ATC_SECTOR_NUMBER_PORT, 4, 8);
    controller.write(ATC_STATUS_PORT, 0x40, 8);
    expect(controller.read(ATC_STATUS_PORT, 8)).toBe(0x51);
    expect(controller.read(ATC_ERROR_PORT, 8)).toBe(0x10);
    controller.write(ATC_DEVICE_CONTROL_PORT, 0x04, 8);
    expect(controller.snapshot().status).toBe(0x80);
    controller.write(ATC_DEVICE_CONTROL_PORT, 0, 8);
    expect(controller.snapshot()).toMatchObject({ status: 0x50, error: 0, interruptActive: false });
  });
});
