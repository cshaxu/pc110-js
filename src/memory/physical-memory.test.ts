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

  it("preserves the existing reset-ROM far-jump table trace through mapped ROM", () => {
    const bytes = new Uint8Array(0x10000);
    bytes.set([0x2e, 0xff, 0x2e, 0xfd, 0xf8], 0xfff0);
    bytes.set([0x34, 0x12, 0x00, 0xf0], 0xf8fd);
    const memory = new PhysicalMemory({ ramBytes: 0xa0000 });
    memory.mapRom(createRomImage("system-rom", bytes), 0xf0000);
    const state = new Cpu386State();

    expect(stepInstruction(memory, state).halted).toBe(false);
    expect(state.snapshot()).toMatchObject({
      eip: 0x1234,
      cs: { selector: 0xf000, base: 0x000f0000, limit: 0xffff }
    });
  });
});
