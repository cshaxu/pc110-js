import type { DecodedInstruction } from "../decode/decoder.js";
import type { RebuiltCpuSnapshot } from "../state/cpu-state.js";

/**
 * Conservative 80386 core-cycle estimates for machine-time scheduling.
 * TODO(High): Replace the remaining fallback values with complete Intel 80386
 * timing coverage, including memory addressing, cache, and bus penalties.
 */
export function estimate386Cycles(
  instruction: DecodedInstruction | undefined,
  before: RebuiltCpuSnapshot,
  after: RebuiltCpuSnapshot
): number {
  if (!instruction) return 3;
  const opcode = instruction.opcode;
  if (isStringOpcode(opcode)) return 5;
  if (isIoOpcode(opcode)) return 12;
  if (isConditionalBranch(instruction))
    return after.eip === before.eip + instruction.length ? 3 : 7;
  if (opcode === 0xe8 || opcode === 0xe9 || opcode === 0xea || opcode === 0x9a) return 7;
  if (opcode === 0xc2 || opcode === 0xc3 || opcode === 0xca || opcode === 0xcb || opcode === 0xcf)
    return 8;
  if (opcode === 0xf4) return 2;
  return 2 + instruction.prefixes.bytes;
}

function isStringOpcode(opcode: number): boolean {
  return (opcode >= 0x6c && opcode <= 0x6f) || (opcode >= 0xa4 && opcode <= 0xaf);
}

function isIoOpcode(opcode: number): boolean {
  return (opcode >= 0xe4 && opcode <= 0xe7) || (opcode >= 0xec && opcode <= 0xef);
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
