export interface LocalAssetDescriptor {
  readonly id: string;
  readonly relativePath: string;
  readonly expectedBytes: number;
  readonly sha256: string;
  readonly required: boolean;
}

export interface AssetValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

const sha256Pattern = /^[a-f0-9]{64}$/;

export function validateAssetDescriptor(descriptor: LocalAssetDescriptor): string[] {
  const errors: string[] = [];
  if (!/^[a-z][a-z0-9-]*$/.test(descriptor.id))
    errors.push("Asset id must be lowercase kebab-case");
  if (
    descriptor.relativePath.startsWith("/") ||
    descriptor.relativePath.includes("\\") ||
    descriptor.relativePath.split("/").some((part) => part === ".." || part === ".")
  ) {
    errors.push("Asset path must be a forward-slash relative path");
  }
  if (!Number.isSafeInteger(descriptor.expectedBytes) || descriptor.expectedBytes < 0) {
    errors.push("Expected asset size must be a nonnegative integer");
  }
  if (!sha256Pattern.test(descriptor.sha256))
    errors.push("Asset SHA-256 must be 64 lowercase hex characters");
  return errors;
}

export async function validateAssetBytes(
  descriptor: LocalAssetDescriptor,
  bytes: Uint8Array
): Promise<AssetValidationResult> {
  const errors = validateAssetDescriptor(descriptor);
  if (bytes.byteLength !== descriptor.expectedBytes) {
    errors.push(`Expected ${descriptor.expectedBytes} bytes but received ${bytes.byteLength}`);
  }
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const actualHash = Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
  if (actualHash !== descriptor.sha256) errors.push(`SHA-256 mismatch: ${actualHash}`);
  return { valid: errors.length === 0, errors };
}
