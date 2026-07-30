import { validateAssetBytes, type LocalAssetDescriptor } from "../firmware/asset-manifest.js";

export class LocalAssetLoader {
  public async load(file: File, descriptor: LocalAssetDescriptor): Promise<Uint8Array> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await validateAssetBytes(descriptor, bytes);
    if (!result.valid)
      throw new Error(`Asset ${descriptor.id} is invalid: ${result.errors.join("; ")}`);
    return bytes;
  }
}
