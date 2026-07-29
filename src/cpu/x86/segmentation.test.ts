import { describe, expect, it } from "vitest";
import {
  loadDescriptor,
  loadInterruptGate,
  loadLocalDescriptorTable,
  SegmentDescriptorError,
  validateDescriptorAccess,
  validateDescriptorOffset,
  validateDescriptorRange
} from "./segmentation.js";

describe("80386 descriptor decoding", () => {
  it("decodes a present 32-bit page-granular code descriptor", () => {
    const values = new Map<number, number>([
      [0x1008, 0x0000ffff],
      [0x100c, 0x00cf9a00]
    ]);
    const memory = { readUint32: (address: number) => values.get(address) ?? 0 };

    expect(loadDescriptor(memory, { base: 0x1000, limit: 0x17 }, 0x08)).toEqual({
      selector: 0x08,
      base: 0,
      limit: 0xffffffff,
      type: 0x0a,
      system: true,
      dpl: 0,
      present: true,
      available: false,
      default32: true,
      granularityPages: true
    });
  });

  it("rejects null and out-of-range selectors", () => {
    const memory = { readUint32: () => 0 };
    expect(() => loadDescriptor(memory, { base: 0, limit: 7 }, 0)).toThrow(SegmentDescriptorError);
    expect(() => loadDescriptor(memory, { base: 0, limit: 7 }, 8)).toThrow(SegmentDescriptorError);
  });

  it("loads a present LDT system descriptor only from the GDT", () => {
    const values = new Map<number, number>([
      [0x1008, 0x20000017],
      [0x100c, 0x00008200]
    ]);
    const memory = { readUint32: (address: number) => values.get(address) ?? 0 };
    const gdt = { base: 0x1000, limit: 0x0f };

    expect(loadLocalDescriptorTable(memory, gdt, 0x08)).toEqual({ base: 0x2000, limit: 0x17 });
    expect(loadLocalDescriptorTable(memory, gdt, 0)).toBeUndefined();
    expect(() => loadLocalDescriptorTable(memory, gdt, 0x0c)).toThrow("must reference the GDT");
  });

  it("enforces descriptor access and expand-down limits", () => {
    const data = {
      selector: 0x13,
      base: 0,
      limit: 0x0fff,
      type: 0x06,
      system: true,
      dpl: 3,
      present: true,
      available: false,
      default32: false,
      granularityPages: false
    };

    expect(() => validateDescriptorAccess(data, 3, "write")).not.toThrow();
    expect(() => validateDescriptorAccess(data, 3, "stack")).not.toThrow();
    expect(() => validateDescriptorOffset(data, 0x1000)).not.toThrow();
    expect(() => validateDescriptorOffset(data, 0x0fff)).toThrow("Expand-down");
    expect(() => validateDescriptorRange(data, 0x1000, 2)).not.toThrow();
    expect(() => validateDescriptorAccess({ ...data, type: 0x0a }, 3, "write")).toThrow(
      "not writable"
    );
    expect(() => validateDescriptorAccess({ ...data, selector: 0x10 }, 3, "stack")).toThrow(
      "Stack segment privilege"
    );
    expect(() => validateDescriptorRange({ ...data, type: 0x02 }, 0x0fff, 2)).toThrow(
      "Segment limit"
    );
  });

  it("decodes 16-bit and 32-bit IDT interrupt and trap gates", () => {
    const values = new Map<number, number>([
      [0x1100, 0x00081234],
      [0x1104, 0x56788e00],
      [0x1108, 0x00105678],
      [0x110c, 0x1234ef00]
    ]);
    const memory = { readUint32: (address: number) => values.get(address) ?? 0 };

    expect(loadInterruptGate(memory, { base: 0x1000, limit: 0x1ff }, 0x20)).toEqual({
      vector: 0x20,
      selector: 0x0008,
      offset: 0x56781234,
      type: 0x0e,
      dpl: 0,
      present: true,
      default32: true,
      trap: false
    });
    expect(loadInterruptGate(memory, { base: 0x1000, limit: 0x1ff }, 0x21)).toMatchObject({
      selector: 0x0010,
      offset: 0x12345678,
      type: 0x0f,
      dpl: 3,
      present: true,
      default32: true,
      trap: true
    });
  });
});
