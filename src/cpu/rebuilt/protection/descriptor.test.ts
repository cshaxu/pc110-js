import { describe, expect, it } from "vitest";
import { readGdtDescriptor } from "./descriptor.js";

describe("rebuilt GDT descriptor lookup", () => {
  it("decodes an 80386 flat present data descriptor", () => {
    const bytes = new Uint8Array(0x20);
    bytes.set([0xff, 0xff, 0, 0, 0, 0x92, 0xcf, 0], 0x08);
    const descriptor = readGdtDescriptor(
      { readUint8: (address) => bytes[address]!, writeUint8: () => undefined },
      { base: 0, limit: 0x1f },
      0x08
    );
    expect(descriptor).toEqual({
      base: 0,
      limit: 0xffff_ffff,
      type: 2,
      system: true,
      dpl: 0,
      present: true,
      default32: true,
      granularity: true
    });
  });
});
