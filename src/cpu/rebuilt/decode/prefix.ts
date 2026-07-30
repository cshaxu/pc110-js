import type { SegmentName } from "../state/segments.js";
import type { InstructionReader } from "./instruction-reader.js";

export type OperandSize = 16 | 32;
export type AddressSize = 16 | 32;

export interface PrefixState {
  readonly bytes: number;
  readonly operandSize: OperandSize;
  readonly addressSize: AddressSize;
  readonly segmentOverride?: SegmentName;
  readonly repeat?: "rep" | "repne";
  readonly lock: boolean;
}

export function decodePrefixes(
  reader: InstructionReader,
  defaultOperandSize: OperandSize,
  defaultAddressSize: AddressSize
): PrefixState {
  let bytes = 0;
  let operandOverride = false;
  let addressOverride = false;
  let segmentOverride: SegmentName | undefined;
  let repeat: "rep" | "repne" | undefined;
  let lock = false;

  while (bytes < 15) {
    const prefix = reader.readCodeByte(bytes) & 0xff;
    if (prefix === 0x66) operandOverride = true;
    else if (prefix === 0x67) addressOverride = true;
    else if (prefix === 0x26) segmentOverride = "es";
    else if (prefix === 0x2e) segmentOverride = "cs";
    else if (prefix === 0x36) segmentOverride = "ss";
    else if (prefix === 0x3e) segmentOverride = "ds";
    else if (prefix === 0x64) segmentOverride = "fs";
    else if (prefix === 0x65) segmentOverride = "gs";
    else if (prefix === 0xf2) repeat = "repne";
    else if (prefix === 0xf3) repeat = "rep";
    else if (prefix === 0xf0) lock = true;
    else break;
    bytes += 1;
  }

  return {
    bytes,
    operandSize: operandOverride ? otherSize(defaultOperandSize) : defaultOperandSize,
    addressSize: addressOverride ? otherSize(defaultAddressSize) : defaultAddressSize,
    segmentOverride,
    repeat,
    lock
  };
}

function otherSize(size: OperandSize): OperandSize {
  return size === 16 ? 32 : 16;
}
