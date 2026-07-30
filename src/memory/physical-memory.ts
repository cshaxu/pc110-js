import type { RomImage } from "../firmware/rom-image.js";

interface MemoryRegion {
  readonly start: number;
  readonly end: number;
  readonly bytes: Uint8Array;
  readonly writable: boolean;
}

export interface MemoryMappedDevice {
  readUint8(offset: number): number;
  writeUint8(offset: number, value: number): void;
}

interface DeviceRegion {
  readonly start: number;
  readonly end: number;
  readonly device: MemoryMappedDevice;
}

export interface PhysicalMemoryOptions {
  readonly ramBytes: number;
  readonly a20Enabled?: boolean;
  readonly unmappedReadValue?: number;
  readonly ignoreUnmappedWrites?: boolean;
}

export class PhysicalMemoryError extends Error {}

export class PhysicalMemory {
  private readonly regions: MemoryRegion[];
  private readonly devices: DeviceRegion[] = [];
  private a20Enabled: boolean;
  private readonly unmappedReadValue: number | undefined;
  private readonly ignoreUnmappedWrites: boolean;

  public constructor(options: PhysicalMemoryOptions) {
    if (!Number.isSafeInteger(options.ramBytes) || options.ramBytes <= 0) {
      throw new PhysicalMemoryError("RAM size must be a positive safe integer");
    }
    this.regions = [this.createRegion(0, new Uint8Array(options.ramBytes), true)];
    this.a20Enabled = options.a20Enabled ?? false;
    if (options.unmappedReadValue !== undefined && !Number.isInteger(options.unmappedReadValue))
      throw new PhysicalMemoryError("Unmapped read value must be an integer");
    this.unmappedReadValue =
      options.unmappedReadValue === undefined ? undefined : options.unmappedReadValue & 0xff;
    this.ignoreUnmappedWrites = options.ignoreUnmappedWrites ?? false;
  }

  public setA20Enabled(enabled: boolean): void {
    this.a20Enabled = enabled;
  }

  public isA20Enabled(): boolean {
    return this.a20Enabled;
  }

  public mapRam(start: number, size: number): void {
    if (!Number.isSafeInteger(size) || size <= 0) {
      throw new PhysicalMemoryError("RAM region size must be a positive safe integer");
    }
    this.addRegion(this.createRegion(start, new Uint8Array(size), true));
  }

  public mapRom(image: RomImage, start: number, aliases: readonly number[] = []): void {
    const locations = [start, ...aliases];
    for (const location of locations) {
      this.addRegion(this.createRegion(location, image.bytes, false));
    }
  }

  /** Maps a hardware aperture over writable RAM while retaining immutable ROM ownership. */
  public mapDevice(start: number, size: number, device: MemoryMappedDevice): void {
    if (!Number.isSafeInteger(size) || size <= 0) {
      throw new PhysicalMemoryError("Device region size must be a positive safe integer");
    }
    const region = this.createDeviceRegion(start, size, device);
    if (
      this.devices.some((existing) => region.start < existing.end && existing.start < region.end)
    ) {
      throw new PhysicalMemoryError("Physical device regions cannot overlap");
    }
    if (
      this.regions.some(
        (existing) =>
          !existing.writable && region.start < existing.end && existing.start < region.end
      )
    ) {
      throw new PhysicalMemoryError("Physical device regions cannot overlap immutable memory");
    }
    this.devices.push(region);
  }

  public readUint8(address: number): number {
    const normalized = this.normalizeAddress(address);
    const device = this.findDevice(normalized);
    if (device) return device.device.readUint8(normalized - device.start) & 0xff;
    const region = this.findRegion(normalized);
    if (!region && this.unmappedReadValue !== undefined) return this.unmappedReadValue;
    if (!region)
      throw new PhysicalMemoryError(`Unmapped physical read at 0x${normalized.toString(16)}`);
    return region.bytes[normalized - region.start];
  }

  public writeUint8(address: number, value: number): void {
    const normalized = this.normalizeAddress(address);
    const device = this.findDevice(normalized);
    if (device) {
      device.device.writeUint8(normalized - device.start, value & 0xff);
      return;
    }
    const region = this.findRegion(normalized);
    if (!region && this.ignoreUnmappedWrites) return;
    if (!region)
      throw new PhysicalMemoryError(`Unmapped physical write at 0x${normalized.toString(16)}`);
    if (region.writable) region.bytes[normalized - region.start] = value & 0xff;
  }

  public readUint32(address: number): number {
    return (
      (this.readUint8(address) |
        (this.readUint8(address + 1) << 8) |
        (this.readUint8(address + 2) << 16) |
        (this.readUint8(address + 3) << 24)) >>>
      0
    );
  }

  public writeUint32(address: number, value: number): void {
    this.writeUint8(address, value);
    this.writeUint8(address + 1, value >>> 8);
    this.writeUint8(address + 2, value >>> 16);
    this.writeUint8(address + 3, value >>> 24);
  }

  private createRegion(start: number, bytes: Uint8Array, writable: boolean): MemoryRegion {
    if (!Number.isSafeInteger(start) || start < 0 || start > 0xffffffff) {
      throw new PhysicalMemoryError("Physical region start must be a 32-bit unsigned address");
    }
    if (bytes.byteLength === 0 || start + bytes.byteLength - 1 > 0xffffffff) {
      throw new PhysicalMemoryError("Physical region must fit within the 32-bit address space");
    }
    return { start, end: start + bytes.byteLength, bytes, writable };
  }

  private createDeviceRegion(
    start: number,
    size: number,
    device: MemoryMappedDevice
  ): DeviceRegion {
    if (!Number.isSafeInteger(start) || start < 0 || start > 0xffffffff) {
      throw new PhysicalMemoryError("Physical device start must be a 32-bit unsigned address");
    }
    if (start + size - 1 > 0xffffffff) {
      throw new PhysicalMemoryError(
        "Physical device region must fit within the 32-bit address space"
      );
    }
    return { start, end: start + size, device };
  }

  private addRegion(region: MemoryRegion): void {
    if (
      this.regions.some((existing) => region.start < existing.end && existing.start < region.end)
    ) {
      throw new PhysicalMemoryError("Physical memory regions cannot overlap");
    }
    this.regions.push(region);
  }

  private normalizeAddress(address: number): number {
    if (!Number.isSafeInteger(address) || address < 0 || address > 0xffffffff) {
      throw new PhysicalMemoryError("Physical address must be a 32-bit unsigned address");
    }
    return this.a20Enabled ? address : (address & ~0x00100000) >>> 0;
  }

  private findRegion(address: number): MemoryRegion | undefined {
    return this.regions.find((region) => address >= region.start && address < region.end);
  }

  private findDevice(address: number): DeviceRegion | undefined {
    return this.devices.find((device) => address >= device.start && address < device.end);
  }
}
