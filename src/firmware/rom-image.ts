import { validateAssetBytes, type LocalAssetDescriptor } from "./asset-manifest.js";

export interface FirmwareByteSource {
  load(relativePath: string): Promise<Uint8Array>;
}

export interface RomImage {
  readonly id: string;
  readonly bytes: Uint8Array;
}

export class FirmwareImageError extends Error {}

export function createRomImage(id: string, bytes: Uint8Array): RomImage {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    throw new FirmwareImageError("ROM id must be lowercase kebab-case");
  }
  return { id, bytes: Uint8Array.from(bytes) };
}

export async function loadRomImage(
  source: FirmwareByteSource,
  descriptor: LocalAssetDescriptor
): Promise<RomImage> {
  const bytes = await source.load(descriptor.relativePath);
  const validation = await validateAssetBytes(descriptor, bytes);
  if (!validation.valid) throw new FirmwareImageError(validation.errors.join("; "));
  return createRomImage(descriptor.id, bytes);
}
