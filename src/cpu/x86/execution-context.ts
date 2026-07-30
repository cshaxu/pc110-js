export type ExecutionSize = 16 | 32;

export type SegmentOverride = "cs" | "ds" | "es" | "ss" | "fs" | "gs";

export type RepeatPrefix = "rep" | "repne";

export interface ExecutionDefaults {
  readonly codeDefault32: boolean;
  readonly stackDefault32: boolean;
}

export interface InstructionByteReader {
  readByte(displacement: number): number;
}

export interface ExecutionContext {
  readonly instructionPointer: number;
  readonly opcode: number;
  readonly opcodeOffset: number;
  readonly operandSize: ExecutionSize;
  readonly addressSize: ExecutionSize;
  readonly stackAddressSize: ExecutionSize;
  readonly segmentOverride?: SegmentOverride;
  readonly repeatPrefix?: RepeatPrefix;
  readonly lock: boolean;
}

const MAX_INSTRUCTION_PREFIX_BYTES = 15;

function executionSize(default32: boolean, overridden: boolean): ExecutionSize {
  return default32 !== overridden ? 32 : 16;
}

function segmentOverrideFor(prefix: number): SegmentOverride | undefined {
  switch (prefix) {
    case 0x26:
      return "es";
    case 0x2e:
      return "cs";
    case 0x36:
      return "ss";
    case 0x3e:
      return "ds";
    case 0x64:
      return "fs";
    case 0x65:
      return "gs";
    default:
      return undefined;
  }
}

/**
 * Decodes instruction-scoped defaults without mutating CPU state. Repeated 66
 * and 67 prefixes select the non-default width once; they never toggle it back.
 */
export function decodeExecutionContext(
  reader: InstructionByteReader,
  instructionPointer: number,
  defaults: ExecutionDefaults
): ExecutionContext {
  let opcodeOffset = 0;
  let operandSizeOverride = false;
  let addressSizeOverride = false;
  let segmentOverride: SegmentOverride | undefined;
  let repeatPrefix: RepeatPrefix | undefined;
  let lock = false;

  while (opcodeOffset < MAX_INSTRUCTION_PREFIX_BYTES) {
    const prefix = reader.readByte(opcodeOffset) & 0xff;
    const segment = segmentOverrideFor(prefix);
    if (segment) {
      segmentOverride = segment;
      opcodeOffset += 1;
      continue;
    }
    if (prefix === 0x66) {
      operandSizeOverride = true;
      opcodeOffset += 1;
      continue;
    }
    if (prefix === 0x67) {
      addressSizeOverride = true;
      opcodeOffset += 1;
      continue;
    }
    if (prefix === 0xf0) {
      lock = true;
      opcodeOffset += 1;
      continue;
    }
    if (prefix === 0xf2 || prefix === 0xf3) {
      repeatPrefix = prefix === 0xf2 ? "repne" : "rep";
      opcodeOffset += 1;
      continue;
    }
    return {
      instructionPointer: instructionPointer >>> 0,
      opcode: prefix,
      opcodeOffset,
      operandSize: executionSize(defaults.codeDefault32, operandSizeOverride),
      addressSize: executionSize(defaults.codeDefault32, addressSizeOverride),
      stackAddressSize: defaults.stackDefault32 ? 32 : 16,
      ...(segmentOverride === undefined ? {} : { segmentOverride }),
      ...(repeatPrefix === undefined ? {} : { repeatPrefix }),
      lock
    };
  }

  throw new RangeError("Instruction prefix sequence exceeds the 80386 length limit");
}

export function instructionLength(context: ExecutionContext, trailingByteCount: number): number {
  if (!Number.isInteger(trailingByteCount) || trailingByteCount < 0)
    throw new RangeError("Instruction trailing byte count must be a non-negative integer");
  return context.opcodeOffset + 1 + trailingByteCount;
}
