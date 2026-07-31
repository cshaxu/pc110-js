import { describe, expect, it } from "vitest";
import { FLOPPY_1440K_GEOMETRY, FloppyDrive } from "./floppy-drive.js";

describe("raw CHS floppy drive", () => {
  it("attaches a complete raw image and resolves CHS sectors without filesystem knowledge", () => {
    const drive = new FloppyDrive({
      cylinders: 2,
      heads: 2,
      sectorsPerTrack: 3,
      bytesPerSector: 4
    });
    const image = Uint8Array.from({ length: 48 }, (_, index) => index);
    drive.attach(image);

    expect(drive.readSector(0, 0, 1)).toEqual(Uint8Array.from([0, 1, 2, 3]));
    expect(drive.readSector(1, 1, 3)).toEqual(Uint8Array.from([44, 45, 46, 47]));
    expect(drive.snapshot()).toEqual({
      attached: true,
      ready: true,
      writeProtected: true,
      changed: true,
      bytes: 48
    });
  });

  it("enforces image geometry, CHS range, attachment, and write-protect contracts", () => {
    const drive = new FloppyDrive({
      cylinders: 1,
      heads: 1,
      sectorsPerTrack: 2,
      bytesPerSector: 4
    });
    expect(() => drive.attach(new Uint8Array(7))).toThrow("expected 8");
    expect(() => drive.readSector(0, 0, 1)).toThrow("no attached media");
    drive.attach(new Uint8Array(8));
    expect(() => drive.readSector(0, 0, 3)).toThrow("outside 1-2");
    expect(() => drive.writeSector(0, 0, 1, new Uint8Array(4))).toThrow("write-protected");
    drive.eject();
    expect(drive.snapshot()).toMatchObject({ attached: false, ready: false, changed: true });
  });

  it("permits explicit writable raw-sector updates and returns defensive sector copies", () => {
    const drive = new FloppyDrive({
      cylinders: 1,
      heads: 1,
      sectorsPerTrack: 1,
      bytesPerSector: 4
    });
    drive.attach(Uint8Array.from([1, 2, 3, 4]), false);
    const sector = drive.readSector(0, 0, 1);
    sector[0] = 0xff;
    expect(drive.readSector(0, 0, 1)).toEqual(Uint8Array.from([1, 2, 3, 4]));
    drive.writeSector(0, 0, 1, Uint8Array.from([5, 6, 7, 8]));
    expect(drive.readSector(0, 0, 1)).toEqual(Uint8Array.from([5, 6, 7, 8]));
  });

  it("restores media bytes and attachment metadata independently of host files", () => {
    const drive = new FloppyDrive({
      cylinders: 1,
      heads: 1,
      sectorsPerTrack: 1,
      bytesPerSector: 4
    });
    drive.attach(Uint8Array.from([1, 2, 3, 4]), false);
    drive.clearChanged();
    const checkpoint = drive.capture();

    drive.writeSector(0, 0, 1, Uint8Array.from([5, 6, 7, 8]));
    drive.eject();
    drive.restore(checkpoint);

    expect(drive.capture()).toEqual(checkpoint);
    expect(drive.readSector(0, 0, 1)).toEqual(Uint8Array.from([1, 2, 3, 4]));
  });

  it("defines the selected known-good image geometry without attaching protected media", () => {
    const drive = new FloppyDrive(FLOPPY_1440K_GEOMETRY);
    expect(drive.byteLength()).toBe(1_474_560);
    expect(drive.snapshot()).toMatchObject({ attached: false, bytes: 0 });
  });
});
