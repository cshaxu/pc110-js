import { describe, expect, it } from "vitest";
import {
  ATC_CYLINDER_HIGH_PORT,
  ATC_CYLINDER_LOW_PORT,
  ATC_DATA_PORT,
  ATC_DEVICE_CONTROL_PORT,
  ATC_DRIVE_HEAD_PORT,
  ATC_ERROR_PORT,
  ATC_SECTOR_NUMBER_PORT,
  ATC_SECTOR_COUNT_PORT,
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

  it("transfers real PIO sector data and advances CHS/register state", () => {
    const interrupts: boolean[] = [];
    const controller = new AtFixedDiskController((active) => interrupts.push(active));
    const drive = new FixedDrive({ cylinders: 1, heads: 1, sectorsPerTrack: 2, bytesPerSector: 4 });
    drive.attach(Uint8Array.from([0x10, 0x11, 0x12, 0x13, 0x20, 0x21, 0x22, 0x23]));
    controller.attachDrive(0, drive);
    controller.write(ATC_SECTOR_COUNT_PORT, 2, 8);
    controller.write(ATC_SECTOR_NUMBER_PORT, 1, 8);
    controller.write(ATC_STATUS_PORT, 0x20, 8);

    expect(controller.read(ATC_STATUS_PORT, 8)).toBe(0x58);
    expect(controller.read(ATC_DATA_PORT, 16)).toBe(0x1110);
    expect(controller.read(ATC_DATA_PORT, 16)).toBe(0x1312);
    expect(controller.snapshot()).toMatchObject({
      sectorCount: 1,
      sectorNumber: 2,
      status: 0x58,
      dataBytesPending: 4
    });
    expect(controller.read(ATC_DATA_PORT, 8)).toBe(0x20);
    expect(controller.read(ATC_DATA_PORT, 8)).toBe(0x21);
    expect(controller.read(ATC_DATA_PORT, 16)).toBe(0x2322);
    expect(controller.snapshot()).toMatchObject({
      sectorCount: 0,
      sectorNumber: 1,
      status: 0x50,
      dataBytesPending: 0
    });
    expect(interrupts.filter(Boolean)).toHaveLength(2);
  });

  it("writes real PIO sectors with word ordering, progression, and write-protect errors", () => {
    const controller = new AtFixedDiskController();
    const drive = new FixedDrive({ cylinders: 1, heads: 1, sectorsPerTrack: 2, bytesPerSector: 4 });
    drive.attach(new Uint8Array(8), false);
    controller.attachDrive(0, drive);
    controller.write(ATC_SECTOR_COUNT_PORT, 2, 8);
    controller.write(ATC_SECTOR_NUMBER_PORT, 1, 8);
    controller.write(ATC_STATUS_PORT, 0x30, 8);
    expect(controller.read(ATC_STATUS_PORT, 8)).toBe(0x58);
    controller.write(ATC_DATA_PORT, 0x1110, 16);
    controller.write(ATC_DATA_PORT, 0x1312, 16);
    expect(controller.snapshot()).toMatchObject({ sectorCount: 1, sectorNumber: 2, status: 0x58 });
    controller.write(ATC_DATA_PORT, 0x2120, 16);
    controller.write(ATC_DATA_PORT, 0x2322, 16);
    expect(drive.readSector(0, 0, 1)).toEqual(Uint8Array.from([0x10, 0x11, 0x12, 0x13]));
    expect(drive.readSector(0, 0, 2)).toEqual(Uint8Array.from([0x20, 0x21, 0x22, 0x23]));
    expect(controller.snapshot()).toMatchObject({ sectorCount: 0, status: 0x50 });

    const protectedDrive = new FixedDrive({
      cylinders: 1,
      heads: 1,
      sectorsPerTrack: 1,
      bytesPerSector: 4
    });
    protectedDrive.attach(new Uint8Array(4), true);
    controller.attachDrive(0, protectedDrive);
    controller.write(ATC_SECTOR_COUNT_PORT, 1, 8);
    controller.write(ATC_SECTOR_NUMBER_PORT, 1, 8);
    controller.write(ATC_STATUS_PORT, 0x30, 8);
    controller.write(ATC_DATA_PORT, 0x0100, 16);
    controller.write(ATC_DATA_PORT, 0x0302, 16);
    expect(controller.read(ATC_STATUS_PORT, 8)).toBe(0x51);
    expect(controller.read(ATC_ERROR_PORT, 8)).toBe(0x04);
  });
});
