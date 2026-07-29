import { describe, expect, it } from "vitest";
import { FirmwareImageError, createRomImage, loadRomImage } from "./rom-image.js";

describe("ROM image loading", () => {
  it("copies ROM bytes so callers cannot mutate the mapped firmware image", () => {
    const source = new Uint8Array([0xea, 0x34]);
    const image = createRomImage("system-rom", source);
    source[0] = 0;

    expect(image).toEqual({ id: "system-rom", bytes: new Uint8Array([0xea, 0x34]) });
  });

  it("validates a locally loaded ROM against its declared asset contract", async () => {
    const bytes = new Uint8Array([0x01, 0x02, 0x03]);
    const image = await loadRomImage(
      { load: async (path) => (path === "firmware/system.bin" ? bytes : new Uint8Array()) },
      {
        id: "system-rom",
        relativePath: "firmware/system.bin",
        expectedBytes: 3,
        sha256: "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
        required: true
      }
    );

    expect(image.bytes).toEqual(bytes);
  });

  it("rejects invalid ROM identifiers and failed asset validation", async () => {
    expect(() => createRomImage("System ROM", new Uint8Array())).toThrow(FirmwareImageError);
    await expect(
      loadRomImage(
        { load: async () => new Uint8Array([0x01]) },
        {
          id: "system-rom",
          relativePath: "firmware/system.bin",
          expectedBytes: 1,
          sha256: "0000000000000000000000000000000000000000000000000000000000000000",
          required: true
        }
      )
    ).rejects.toThrow(FirmwareImageError);
  });
});
