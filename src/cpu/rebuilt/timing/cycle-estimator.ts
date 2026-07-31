import type { DecodedInstruction } from "../decode/decoder.js";

/**
 * PCjs-compatible 80286-derived core-cycle charges for machine-time scheduling.
 *
 * The explicit classes use PCjs's selected 80286-compatible
 * control/stack timings where 80386-specific timing is not yet modelled. They
 * are deliberately not a physical bus, cache, or wait-state simulation.
 * TODO(High): Replace the remaining fallback and compatibility timings with
 * complete Intel 80386 timing coverage, including memory addressing, cache,
 * and bus penalties.
 */
export function estimate386Cycles(
  instruction: DecodedInstruction | undefined,
  beforeEip: number,
  afterEip: number
): number {
  if (!instruction) return 3;
  const opcode = instruction.opcode;
  if (isStringOpcode(opcode)) return 5;
  if (isIoOpcode(opcode)) return 5;
  if (isPushOpcode(opcode)) return withPrefixes(3, instruction);
  if (isPopOpcode(opcode)) return withPrefixes(5, instruction);
  if (opcode === 0x60) return withPrefixes(17, instruction);
  if (opcode === 0x61) return withPrefixes(19, instruction);
  if (opcode === 0x90 || (opcode >= 0x91 && opcode <= 0x97) || opcode === 0x86 || opcode === 0x87)
    return withPrefixes(3, instruction);
  if (isConditionalBranch(instruction)) return afterEip === beforeEip + instruction.length ? 3 : 7;
  if (opcode === 0xea) return withPrefixes(11, instruction);
  if (opcode === 0x9a) return withPrefixes(13, instruction);
  if (opcode === 0xe8 || opcode === 0xe9 || opcode === 0xeb) return withPrefixes(7, instruction);
  if (opcode === 0xc2 || opcode === 0xc3) return withPrefixes(11, instruction);
  if (opcode === 0xca || opcode === 0xcb) return withPrefixes(15, instruction);
  if (opcode === 0xcf) return withPrefixes(17, instruction);
  if (opcode === 0xf4) return 2;
  return 2 + instruction.prefixes.bytes;
}

function withPrefixes(cycles: number, instruction: DecodedInstruction): number {
  return cycles + instruction.prefixes.bytes;
}

function isStringOpcode(opcode: number): boolean {
  return (opcode >= 0x6c && opcode <= 0x6f) || (opcode >= 0xa4 && opcode <= 0xaf);
}

function isIoOpcode(opcode: number): boolean {
  return (opcode >= 0xe4 && opcode <= 0xe7) || (opcode >= 0xec && opcode <= 0xef);
}

function isPushOpcode(opcode: number): boolean {
  return (
    (opcode >= 0x50 && opcode <= 0x57) ||
    opcode === 0x06 ||
    opcode === 0x0e ||
    opcode === 0x16 ||
    opcode === 0x1e ||
    opcode === 0x68 ||
    opcode === 0x6a ||
    opcode === 0x9c
  );
}

function isPopOpcode(opcode: number): boolean {
  return (
    (opcode >= 0x58 && opcode <= 0x5f) ||
    opcode === 0x07 ||
    opcode === 0x17 ||
    opcode === 0x1f ||
    opcode === 0x9d
  );
}

function isConditionalBranch(instruction: DecodedInstruction): boolean {
  return (
    (instruction.opcode >= 0x70 && instruction.opcode <= 0x7f) ||
    instruction.opcode === 0xe0 ||
    instruction.opcode === 0xe1 ||
    instruction.opcode === 0xe2 ||
    instruction.opcode === 0xe3 ||
    (instruction.opcode === 0x0f &&
      instruction.secondaryOpcode !== undefined &&
      instruction.secondaryOpcode >= 0x80 &&
      instruction.secondaryOpcode <= 0x8f)
  );
}
