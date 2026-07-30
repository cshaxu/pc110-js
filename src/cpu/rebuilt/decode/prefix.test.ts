import { describe, expect, it } from "vitest";
import { decodePrefixes } from "./prefix.js";

function reader(bytes: readonly number[]) {
  return { readCodeByte: (offset: number) => bytes[offset] ?? 0x90 };
}

describe("decodePrefixes", () => {
  it("selects the non-default sizes once regardless of repeated prefixes", () => {
    expect(decodePrefixes(reader([0x66, 0x66, 0x67, 0x67, 0x90]), 16, 16)).toMatchObject({
      bytes: 4,
      operandSize: 32,
      addressSize: 32
    });
  });

  it("uses defaults from a default-32 code segment model", () => {
    expect(decodePrefixes(reader([0x66, 0x67, 0x90]), 32, 32)).toMatchObject({
      bytes: 2,
      operandSize: 16,
      addressSize: 16
    });
  });
});
