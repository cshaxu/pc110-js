import { describe, expect, it } from "vitest";
import {
  decodeExecutionContext,
  instructionLength,
  type ExecutionDefaults
} from "./execution-context.js";

function context(
  bytes: number[],
  defaults: ExecutionDefaults,
  instructionPointer = 0
): ReturnType<typeof decodeExecutionContext> {
  return decodeExecutionContext(
    { readByte: (displacement) => bytes[displacement] ?? 0x90 },
    instructionPointer,
    defaults
  );
}

describe("80386 execution context", () => {
  it("uses 16-bit CS defaults until 66 or 67 selects the non-default width", () => {
    const defaults = { codeDefault32: false, stackDefault32: false };

    expect(context([0x90], defaults)).toMatchObject({ operandSize: 16, addressSize: 16 });
    expect(context([0x66, 0x90], defaults)).toMatchObject({
      opcode: 0x90,
      opcodeOffset: 1,
      operandSize: 32,
      addressSize: 16
    });
    expect(context([0x67, 0x90], defaults)).toMatchObject({ operandSize: 16, addressSize: 32 });
  });

  it("uses 32-bit CS defaults until 66 or 67 selects the non-default width", () => {
    const defaults = { codeDefault32: true, stackDefault32: false };

    expect(context([0x90], defaults)).toMatchObject({ operandSize: 32, addressSize: 32 });
    expect(context([0x66, 0x90], defaults)).toMatchObject({ operandSize: 16, addressSize: 32 });
    expect(context([0x67, 0x90], defaults)).toMatchObject({ operandSize: 32, addressSize: 16 });
  });

  it("keeps SS stack address width independent from CS execution defaults", () => {
    expect(context([0x90], { codeDefault32: true, stackDefault32: false })).toMatchObject({
      operandSize: 32,
      addressSize: 32,
      stackAddressSize: 16
    });
    expect(context([0x90], { codeDefault32: false, stackDefault32: true })).toMatchObject({
      operandSize: 16,
      addressSize: 16,
      stackAddressSize: 32
    });
  });

  it("records prefix boundaries without cumulative 66 or 67 toggles", () => {
    const decoded = context(
      [0xf0, 0x2e, 0xf2, 0xf3, 0x66, 0x66, 0x67, 0x67, 0x90],
      { codeDefault32: false, stackDefault32: false },
      0x12345678
    );

    expect(decoded).toMatchObject({
      instructionPointer: 0x12345678,
      opcode: 0x90,
      opcodeOffset: 8,
      operandSize: 32,
      addressSize: 32,
      segmentOverride: "cs",
      repeatPrefix: "rep",
      lock: true
    });
    expect(instructionLength(decoded, 3)).toBe(12);
  });

  it("preserves the instruction-start EIP while deriving an opcode offset", () => {
    const decoded = context(
      [0x66, 0x67, 0x0f, 0x01],
      { codeDefault32: true, stackDefault32: true },
      0x00fffffe
    );

    expect(decoded.instructionPointer).toBe(0x00fffffe);
    expect(decoded.opcode).toBe(0x0f);
    expect(decoded.opcodeOffset).toBe(2);
    expect(instructionLength(decoded, 1)).toBe(4);
  });
});
