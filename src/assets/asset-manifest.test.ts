import { describe, expect, it } from "vitest";
import { validateAssetBytes, validateAssetDescriptor } from "./asset-manifest.js";

const abcAsset = {
  id: "test-media",
  relativePath: "local-assets/test-media.img",
  expectedBytes: 3,
  sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  required: true
};

describe("local asset manifest", () => {
  it("accepts a matching relative asset", async () => {
    await expect(validateAssetBytes(abcAsset, new TextEncoder().encode("abc"))).resolves.toEqual({
      valid: true,
      errors: []
    });
  });

  it("rejects absolute paths and mismatched content", async () => {
    expect(validateAssetDescriptor({ ...abcAsset, relativePath: "C:\\media.img" })).toContain(
      "Asset path must be a forward-slash relative path"
    );
    await expect(
      validateAssetBytes(abcAsset, new TextEncoder().encode("abd"))
    ).resolves.toMatchObject({
      valid: false
    });
  });
});
