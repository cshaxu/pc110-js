import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";
import { FixedDrive } from "./fixed-drive.js";

export const ATC_DATA_PORT = 0x1f0;
export const ATC_ERROR_PORT = 0x1f1;
export const ATC_SECTOR_COUNT_PORT = 0x1f2;
export const ATC_SECTOR_NUMBER_PORT = 0x1f3;
export const ATC_CYLINDER_LOW_PORT = 0x1f4;
export const ATC_CYLINDER_HIGH_PORT = 0x1f5;
export const ATC_DRIVE_HEAD_PORT = 0x1f6;
export const ATC_STATUS_PORT = 0x1f7;
export const ATC_DEVICE_CONTROL_PORT = 0x3f6;

const STATUS_ERROR = 0x01;
const STATUS_SEEK_COMPLETE = 0x10;
const STATUS_READY = 0x40;
const STATUS_BUSY = 0x80;
const ERROR_ABORTED_COMMAND = 0x04;
const ERROR_ID_NOT_FOUND = 0x10;
const DRIVE_HEAD_SELECT_MASK = 0x0f;
const DRIVE_SELECT_MASK = 0x10;
const DRIVE_HEAD_REQUIRED_BITS = 0xa0;
const DEVICE_CONTROL_SOFTWARE_RESET = 0x04;

export interface AtFixedDiskPortRange {
  readonly start: number;
  readonly end: number;
  readonly read?: (port: number, width: PortWidth) => number;
  readonly write?: (port: number, value: number, width: PortWidth) => void;
}

export interface AtFixedDiskSnapshot {
  readonly error: number;
  readonly sectorCount: number;
  readonly sectorNumber: number;
  readonly cylinder: number;
  readonly driveHead: number;
  readonly status: number;
  readonly deviceControl: number;
  readonly selectedDrive: number;
  readonly interruptActive: boolean;
  readonly drives: readonly boolean[];
}

/**
 * Project-native primary PC/AT fixed-disk command block. PIO sector transfer
 * remains a later part; this core provides reset, diagnostic, selection, seek,
 * and verify state without fabricating media data.
 */
export class AtFixedDiskController {
  private readonly drives: Array<FixedDrive | undefined> = [undefined, undefined];
  private error = 0;
  private sectorCount = 0;
  private sectorNumber = 0;
  private cylinderLow = 0;
  private cylinderHigh = 0;
  private driveHead = DRIVE_HEAD_REQUIRED_BITS;
  private status = 0;
  private deviceControl = 0;
  private interruptActive = false;

  public constructor(private readonly onInterrupt: (active: boolean) => void = () => undefined) {}

  public reset(): void {
    this.error = 0;
    this.sectorCount = 0;
    this.sectorNumber = 0;
    this.cylinderLow = 0;
    this.cylinderHigh = 0;
    this.driveHead = DRIVE_HEAD_REQUIRED_BITS;
    this.deviceControl = 0;
    this.interruptActive = false;
    this.updateSelectedStatus();
    this.onInterrupt(false);
  }

  public attachDrive(index: number, drive: FixedDrive): void {
    this.requireDriveIndex(index);
    this.drives[index] = drive;
    this.updateSelectedStatus();
  }

  public detachDrive(index: number): void {
    this.requireDriveIndex(index);
    this.drives[index] = undefined;
    this.updateSelectedStatus();
  }

  public read(port: number, width: PortWidth): number {
    this.requireReadablePort(port, width);
    switch (port) {
      case ATC_DATA_PORT:
        return width === 16 ? 0xffff : 0xff;
      case ATC_ERROR_PORT:
        return this.error;
      case ATC_SECTOR_COUNT_PORT:
        return this.sectorCount;
      case ATC_SECTOR_NUMBER_PORT:
        return this.sectorNumber;
      case ATC_CYLINDER_LOW_PORT:
        return this.cylinderLow;
      case ATC_CYLINDER_HIGH_PORT:
        return this.cylinderHigh;
      case ATC_DRIVE_HEAD_PORT:
        return this.driveHead;
      case ATC_STATUS_PORT: {
        const result = this.status;
        this.setInterrupt(false);
        return result;
      }
      default:
        throw new RangeError(`AT fixed-disk port is not readable: 0x${port.toString(16)}`);
    }
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requireWritablePort(port, width);
    if (port === ATC_DEVICE_CONTROL_PORT) {
      const wasReset = Boolean(this.deviceControl & DEVICE_CONTROL_SOFTWARE_RESET);
      this.deviceControl = value & 0x0f;
      if (!wasReset && this.deviceControl & DEVICE_CONTROL_SOFTWARE_RESET) {
        this.status = STATUS_BUSY;
        this.setInterrupt(false);
      }
      if (wasReset && !(this.deviceControl & DEVICE_CONTROL_SOFTWARE_RESET)) this.reset();
      return;
    }
    if (this.deviceControl & DEVICE_CONTROL_SOFTWARE_RESET) return;
    switch (port) {
      case ATC_DATA_PORT:
        this.fail(ERROR_ABORTED_COMMAND);
        return;
      case ATC_ERROR_PORT:
        return;
      case ATC_SECTOR_COUNT_PORT:
        this.sectorCount = value & 0xff;
        return;
      case ATC_SECTOR_NUMBER_PORT:
        this.sectorNumber = value & 0xff;
        return;
      case ATC_CYLINDER_LOW_PORT:
        this.cylinderLow = value & 0xff;
        return;
      case ATC_CYLINDER_HIGH_PORT:
        this.cylinderHigh = value & 0xff;
        return;
      case ATC_DRIVE_HEAD_PORT:
        this.driveHead = (value & 0x1f) | DRIVE_HEAD_REQUIRED_BITS;
        this.updateSelectedStatus();
        return;
      case ATC_STATUS_PORT:
        this.executeCommand(value & 0xff);
        return;
      default:
        throw new RangeError(`AT fixed-disk port is not writable: 0x${port.toString(16)}`);
    }
  }

  public snapshot(): AtFixedDiskSnapshot {
    return {
      error: this.error,
      sectorCount: this.sectorCount,
      sectorNumber: this.sectorNumber,
      cylinder: this.cylinder(),
      driveHead: this.driveHead,
      status: this.status,
      deviceControl: this.deviceControl,
      selectedDrive: this.selectedDrive(),
      interruptActive: this.interruptActive,
      drives: this.drives.map((drive) => drive?.snapshot().ready ?? false)
    };
  }

  public portRanges(): readonly AtFixedDiskPortRange[] {
    return [
      {
        start: ATC_DATA_PORT,
        end: ATC_STATUS_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      },
      {
        start: ATC_DEVICE_CONTROL_PORT,
        end: ATC_DEVICE_CONTROL_PORT,
        write: (port, value, width) => this.write(port, value, width)
      }
    ];
  }

  private executeCommand(command: number): void {
    this.error = 0;
    this.setInterrupt(false);
    if (!this.selectedDriveMedia()) {
      this.fail(ERROR_ABORTED_COMMAND);
      return;
    }
    switch (command & 0xf0) {
      case 0x10:
        this.cylinderLow = 0;
        this.cylinderHigh = 0;
        this.succeed();
        return;
      case 0x40:
        this.verifyAddress();
        return;
      case 0x70:
        this.verifyCylinderAndHead();
        return;
      case 0x90:
        this.succeed();
        return;
      default:
        if (command === 0x91) {
          this.verifyCylinderAndHead();
          return;
        }
        this.fail(ERROR_ABORTED_COMMAND);
    }
  }

  private verifyAddress(): void {
    const drive = this.selectedDriveMedia();
    if (!drive || this.sectorNumber < 1 || this.sectorNumber > drive.geometry.sectorsPerTrack) {
      this.fail(ERROR_ID_NOT_FOUND);
      return;
    }
    this.verifyCylinderAndHead();
  }

  private verifyCylinderAndHead(): void {
    const drive = this.selectedDriveMedia();
    if (
      !drive ||
      this.cylinder() >= drive.geometry.cylinders ||
      this.head() >= drive.geometry.heads
    ) {
      this.fail(ERROR_ID_NOT_FOUND);
      return;
    }
    this.succeed();
  }

  private succeed(): void {
    this.status = STATUS_READY | STATUS_SEEK_COMPLETE;
    this.setInterrupt(true);
  }

  private fail(error: number): void {
    this.error = error;
    this.status =
      STATUS_ERROR | (this.selectedDriveMedia() ? STATUS_READY | STATUS_SEEK_COMPLETE : 0);
    this.setInterrupt(true);
  }

  private updateSelectedStatus(): void {
    if (this.deviceControl & DEVICE_CONTROL_SOFTWARE_RESET) {
      this.status = STATUS_BUSY;
      return;
    }
    this.status = this.selectedDriveMedia() ? STATUS_READY | STATUS_SEEK_COMPLETE : 0;
  }

  private setInterrupt(active: boolean): void {
    if (active === this.interruptActive) return;
    this.interruptActive = active;
    this.onInterrupt(active);
  }

  private selectedDrive(): number {
    return this.driveHead & DRIVE_SELECT_MASK ? 1 : 0;
  }

  private selectedDriveMedia(): FixedDrive | undefined {
    const drive = this.drives[this.selectedDrive()];
    return drive?.snapshot().ready ? drive : undefined;
  }

  private cylinder(): number {
    return this.cylinderLow | (this.cylinderHigh << 8);
  }

  private head(): number {
    return this.driveHead & DRIVE_HEAD_SELECT_MASK;
  }

  private requireDriveIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index > 1)
      throw new RangeError(`AT fixed-disk drive index is outside 0-1: ${index}`);
  }

  private requireReadablePort(port: number, width: PortWidth): void {
    if (port === ATC_DATA_PORT) {
      if (width !== 8 && width !== 16)
        throw new RangeError(
          `AT fixed-disk data port supports 8- or 16-bit I/O, received ${width}-bit`
        );
      return;
    }
    if (width !== 8)
      throw new RangeError(`AT fixed-disk register supports 8-bit I/O only, received ${width}-bit`);
    if (port < ATC_ERROR_PORT || port > ATC_STATUS_PORT)
      throw new RangeError(`AT fixed-disk port is not readable: 0x${port.toString(16)}`);
  }

  private requireWritablePort(port: number, width: PortWidth): void {
    if (port === ATC_DATA_PORT) {
      if (width !== 8 && width !== 16)
        throw new RangeError(
          `AT fixed-disk data port supports 8- or 16-bit I/O, received ${width}-bit`
        );
      return;
    }
    if (width !== 8)
      throw new RangeError(`AT fixed-disk register supports 8-bit I/O only, received ${width}-bit`);
    if ((port < ATC_ERROR_PORT || port > ATC_STATUS_PORT) && port !== ATC_DEVICE_CONTROL_PORT)
      throw new RangeError(`AT fixed-disk port is not writable: 0x${port.toString(16)}`);
  }
}
