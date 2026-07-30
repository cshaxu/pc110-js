export interface FixedDriveGeometry {
  readonly cylinders: number;
  readonly heads: number;
  readonly sectorsPerTrack: number;
  readonly bytesPerSector: number;
}

export interface FixedDriveSnapshot {
  readonly attached: boolean;
  readonly ready: boolean;
  readonly writeProtected: boolean;
  readonly changed: boolean;
  readonly bytes: number;
}

export const IBM_AT_TYPE_5_GEOMETRY: FixedDriveGeometry = {
  cylinders: 940,
  heads: 6,
  sectorsPerTrack: 17,
  bytesPerSector: 512
};

/**
 * Raw CHS fixed-drive media. It has no controller, filesystem, BIOS, DMA, or
 * host-path knowledge; callers explicitly attach complete validated media.
 */
export class FixedDrive {
  private media: Uint8Array | undefined;
  private writeProtected = true;
  private changed = false;

  public constructor(public readonly geometry: FixedDriveGeometry) {
    this.validateGeometry(geometry);
  }

  public attach(bytes: Uint8Array, writeProtected = true): void {
    if (bytes.byteLength !== this.byteLength())
      throw new RangeError(
        `Fixed-disk image has ${bytes.byteLength} bytes, expected ${this.byteLength()} for configured geometry`
      );
    this.media = new Uint8Array(bytes);
    this.writeProtected = writeProtected;
    this.changed = true;
  }

  public eject(): void {
    if (this.media !== undefined) this.changed = true;
    this.media = undefined;
    this.writeProtected = true;
  }

  public clearChanged(): void {
    this.changed = false;
  }

  public readSector(cylinder: number, head: number, sector: number): Uint8Array {
    const offset = this.offset(cylinder, head, sector);
    return new Uint8Array(this.requireMedia().slice(offset, offset + this.geometry.bytesPerSector));
  }

  public writeSector(cylinder: number, head: number, sector: number, bytes: Uint8Array): void {
    if (this.writeProtected) throw new Error("Fixed-disk media is write-protected");
    if (bytes.byteLength !== this.geometry.bytesPerSector)
      throw new RangeError(
        `Fixed-disk sector has ${bytes.byteLength} bytes, expected ${this.geometry.bytesPerSector}`
      );
    this.requireMedia().set(bytes, this.offset(cylinder, head, sector));
  }

  public snapshot(): FixedDriveSnapshot {
    return {
      attached: this.media !== undefined,
      ready: this.media !== undefined,
      writeProtected: this.writeProtected,
      changed: this.changed,
      bytes: this.media?.byteLength ?? 0
    };
  }

  public byteLength(): number {
    const { cylinders, heads, sectorsPerTrack, bytesPerSector } = this.geometry;
    return cylinders * heads * sectorsPerTrack * bytesPerSector;
  }

  private offset(cylinder: number, head: number, sector: number): number {
    if (!Number.isInteger(cylinder) || cylinder < 0 || cylinder >= this.geometry.cylinders)
      throw new RangeError(
        `Fixed-disk cylinder is outside 0-${this.geometry.cylinders - 1}: ${cylinder}`
      );
    if (!Number.isInteger(head) || head < 0 || head >= this.geometry.heads)
      throw new RangeError(`Fixed-disk head is outside 0-${this.geometry.heads - 1}: ${head}`);
    if (!Number.isInteger(sector) || sector < 1 || sector > this.geometry.sectorsPerTrack)
      throw new RangeError(
        `Fixed-disk sector is outside 1-${this.geometry.sectorsPerTrack}: ${sector}`
      );
    return (
      ((cylinder * this.geometry.heads + head) * this.geometry.sectorsPerTrack + (sector - 1)) *
      this.geometry.bytesPerSector
    );
  }

  private requireMedia(): Uint8Array {
    if (this.media === undefined) throw new Error("Fixed drive has no attached media");
    return this.media;
  }

  private validateGeometry(geometry: FixedDriveGeometry): void {
    for (const [name, value] of Object.entries(geometry)) {
      if (!Number.isSafeInteger(value) || value <= 0)
        throw new RangeError(`Fixed-drive geometry ${name} must be a positive safe integer`);
    }
  }
}
