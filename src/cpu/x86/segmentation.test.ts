import { describe, expect, it } from "vitest";
import { loadDescriptor, SegmentDescriptorError } from "./segmentation.js";

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
});
