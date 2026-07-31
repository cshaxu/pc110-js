import { describe, expect, it } from "vitest";
import { stepInstruction } from "../cpu/x86/execution.js";
import { Cpu386State } from "../cpu/x86/state.js";
import { createRomImage } from "../firmware/rom-image.js";
import { PhysicalMemory, PhysicalMemoryError } from "./physical-memory.js";

describe("PC/AT physical memory", () => {
  it("provides writable low RAM and little-endian page-table accesses", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x200000, a20Enabled: true });
    memory.writeUint32(0x1000, 0x12345678);

    expect(memory.readUint32(0x1000)).toBe(0x12345678);
  });

  it("round-trips writable RAM and A20 without changing immutable ROM", () => {
    const memory = new PhysicalMemory({ ramBytes: 0xa0000, a20Enabled: true });
    memory.mapRam(0x100000, 0x1000);
    memory.mapRom(createRomImage("system-rom", Uint8Array.of(0xea)), 0xf0000);
    memory.writeUint8(0x20, 0x11);
    memory.writeUint8(0x100020, 0x22);
    const captured = memory.capture();

    memory.setA20Enabled(false);
    memory.writeUint8(0x20, 0x33);
    memory.writeUint8(0xf0000, 0x90);
    memory.restore(captured);

    expect(memory.isA20Enabled()).toBe(true);
    expect(memory.readUint8(0x20)).toBe(0x11);
    expect(memory.readUint8(0x100020)).toBe(0x22);
    expect(memory.readUint8(0xf0000)).toBe(0xea);
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

  it("maps the selected M1 low, DeskPro-window, and extended RAM regions", () => {
    const memory = new PhysicalMemory({ ramBytes: 0xa0000, a20Enabled: true });
    memory.mapRam(0xfa0000, 0x60000);
    memory.mapRam(0x100000, 0x300000);

    memory.writeUint8(0x09ffff, 0x11);
    memory.writeUint8(0xfa0000, 0x22);
    memory.writeUint8(0x3fffff, 0x33);
    expect(memory.readUint8(0x09ffff)).toBe(0x11);
    expect(memory.readUint8(0xfa0000)).toBe(0x22);
    expect(memory.readUint8(0x3fffff)).toBe(0x33);
    expect(() => memory.readUint8(0x0a0000)).toThrow(PhysicalMemoryError);
    expect(() => memory.mapRam(0x0f0000, 0x10000)).not.toThrow();
    expect(() => memory.mapRam(0x0f8000, 0x1000)).toThrow(PhysicalMemoryError);
  });

  it("rejects unmapped accesses and overlapping mappings", () => {
    const memory = new PhysicalMemory({ ramBytes: 0xa0000 });
    expect(() => memory.readUint8(0xf0000)).toThrow(PhysicalMemoryError);
    memory.mapRom(createRomImage("system-rom", new Uint8Array([0xea])), 0xf0000);
    expect(() =>
      memory.mapRom(createRomImage("second-rom", new Uint8Array([0x90])), 0xf0000)
    ).toThrow(PhysicalMemoryError);
  });

  it("can model a selected machine's floating physical bus without weakening strict defaults", () => {
    const memory = new PhysicalMemory({
      ramBytes: 0xa0000,
      unmappedReadValue: 0xff,
      ignoreUnmappedWrites: true
    });
    expect(memory.readUint8(0xe0000)).toBe(0xff);
    expect(() => memory.writeUint8(0xe0000, 0x55)).not.toThrow();
    expect(memory.readUint8(0xe0000)).toBe(0xff);
  });

  it("maps a hardware aperture over writable RAM after A20 normalization", () => {
    const accesses: string[] = [];
    const device = {
      readUint8: (offset: number) => {
        accesses.push(`read:${offset.toString(16)}`);
        return 0xa5;
      },
      writeUint8: (offset: number, value: number) => {
        accesses.push(`write:${offset.toString(16)}:${value.toString(16)}`);
      }
    };
    const memory = new PhysicalMemory({ ramBytes: 0x200000 });
    memory.mapDevice(0xa0000, 0x20000, device);

    memory.writeUint8(0x1a0003, 0x5a);
    expect(memory.readUint8(0xa0003)).toBe(0xa5);
    expect(accesses).toEqual(["write:3:5a", "read:3"]);
  });

  it("rejects device overlap with immutable memory or another device", () => {
    const memory = new PhysicalMemory({ ramBytes: 0xa0000, a20Enabled: true });
    const device = { readUint8: () => 0, writeUint8: () => undefined };
    memory.mapRom(createRomImage("system-rom", new Uint8Array([0xea])), 0xf0000);
    memory.mapDevice(0xa0000, 0x20000, device);

    expect(() => memory.mapDevice(0xb0000, 0x10000, device)).toThrow(PhysicalMemoryError);
    expect(() => memory.mapDevice(0xf0000, 1, device)).toThrow(PhysicalMemoryError);
  });

  it("preserves the existing reset-ROM far-jump table trace through mapped ROM", () => {
    const bytes = new Uint8Array(0x8000);
    bytes.set([0x2e, 0xff, 0x2e, 0xfd, 0xf8], 0x7ff0);
    bytes.set([0x34, 0x12, 0x00, 0xf0], 0x78fd);
    const memory = new PhysicalMemory({ ramBytes: 0xa0000, a20Enabled: true });
    memory.mapRom(createRomImage("system-rom", bytes), 0xffff8000, [0xf8000, 0xf0000, 0xffff0000]);
    const state = new Cpu386State();

    expect(stepInstruction(memory, state).halted).toBe(false);
    expect(state.snapshot()).toMatchObject({
      eip: 0x1234,
      cs: { selector: 0xf000, base: 0x000f0000, limit: 0xffff }
    });
  });
});
