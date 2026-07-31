import { describe, expect, it } from "vitest";
import { LocalAssetLoader } from "./local-asset-loader.js";

describe("LocalAssetLoader", () => {
  it("accepts a file only when descriptor size and hash match", async () => {
    const bytes = Uint8Array.from([1, 2, 3]);
    const file = new File([bytes], "firmware.bin");
    const loader = new LocalAssetLoader();
    await expect(
      loader.load(file, {
        id: "firmware",
        relativePath: "firmware.bin",
        expectedBytes: 3,
        sha256: "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
        required: true
      })
    ).resolves.toEqual(bytes);
    await expect(
      loader.loadBytes(bytes, {
        id: "firmware",
        relativePath: "firmware.bin",
        expectedBytes: 3,
        sha256: "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
        required: true
      })
    ).resolves.toEqual(bytes);
  });
});
