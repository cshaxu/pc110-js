import { validateAssetBytes, type LocalAssetDescriptor } from "../firmware/asset-manifest.js";

export class LocalAssetLoader {
  public async load(file: File, descriptor: LocalAssetDescriptor): Promise<Uint8Array> {
    return this.loadBytes(new Uint8Array(await file.arrayBuffer()), descriptor);
  }

  public async loadUrl(url: string, descriptor: LocalAssetDescriptor): Promise<Uint8Array> {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Asset ${descriptor.id} is unavailable: ${response.status}`);
    return this.loadBytes(new Uint8Array(await response.arrayBuffer()), descriptor);
  }

  public async loadBytes(bytes: Uint8Array, descriptor: LocalAssetDescriptor): Promise<Uint8Array> {
    const result = await validateAssetBytes(descriptor, bytes);
    if (!result.valid)
      throw new Error(`Asset ${descriptor.id} is invalid: ${result.errors.join("; ")}`);
    return bytes;
  }
}
