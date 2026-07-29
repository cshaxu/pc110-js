import { describe, expect, it } from "vitest";
import { createRomImage } from "../firmware/rom-image.js";
import { PhysicalMemory, PhysicalMemoryError } from "./physical-memory.js";

describe("PC/AT physical memory", () => {
  it("provides writable low RAM and little-endian page-table accesses", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x200000, a20Enabled: true });
    memory.writeUint32(0x1000, 0x12345678);

    expect(memory.readUint32(0x1000)).toBe(0x12345678);
  });

  it("gates address bit 20 when A20 is disabled", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x200000 });
    memory.writeUint8(0x000000, 0x11);
    memory.writeUint8(0x100000, 0x22);
    expect(memory.readUint8(0x000000)).toBe(0x22);

    memory.setA20Enabled(true);
    memory.writeUint8(0x100000, 0x33);
    expect(memory.readUint8(0x000000)).toBe(0x22);
    expect(memory.readUint8(0x100000)).toBe(0x33);
  });

  it("maps immutable ROM bytes at the primary window and explicit aliases", () => {
    const memory = new PhysicalMemory({ ramBytes: 0xa0000, a20Enabled: true });
    memory.mapRom(createRomImage("system-rom", new Uint8Array([0xea, 0x34])), 0xf0000, [
      0xfff00000
    ]);

    expect(memory.readUint8(0xf0000)).toBe(0xea);
    expect(memory.readUint8(0xfff00001)).toBe(0x34);
    memory.writeUint8(0xf0000, 0x90);
    expect(memory.readUint8(0xf0000)).toBe(0xea);
  });

  it("rejects unmapped accesses and overlapping mappings", () => {
    const memory = new PhysicalMemory({ ramBytes: 0xa0000 });
    expect(() => memory.readUint8(0xf0000)).toThrow(PhysicalMemoryError);
    memory.mapRom(createRomImage("system-rom", new Uint8Array([0xea])), 0xf0000);
    expect(() =>
      memory.mapRom(createRomImage("second-rom", new Uint8Array([0x90])), 0xf0000)
    ).toThrow(PhysicalMemoryError);
  });
});
