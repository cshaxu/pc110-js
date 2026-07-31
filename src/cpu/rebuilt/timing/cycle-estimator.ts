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
  afterEip: number,
  codeDefault32 = true,
  repeatContinuation = false
): number {
  if (!instruction) return 3;
  const opcode = instruction.opcode;
  const modRm = instruction.modRm;
  if (isStringOpcode(opcode))
    return instruction.prefixes.repeat === undefined ? 5 : repeatContinuation ? 3 : 7;
  if (isIoOpcode(opcode)) return 5;
  if (opcode === 0xa8 || opcode === 0xa9 || opcode === 0xfa) return 3;
  if (isAccumulatorArithmeticImmediate(opcode)) return 3;
  if (opcode >= 0xa0 && opcode <= 0xa1) return 5;
  if (opcode >= 0xa2 && opcode <= 0xa3) return 3;
  const groupSevenCycles = groupSevenCyclesFor(instruction);
  if (groupSevenCycles !== undefined) return groupSevenCycles;
  const controlRegisterCycles = controlRegisterCyclesFor(instruction);
  if (controlRegisterCycles !== undefined) return controlRegisterCycles;
  if (opcode >= 0x80 && opcode <= 0x83 && modRm) return modRm.memory ? 7 : 3;
  if (opcode >= 0x38 && opcode <= 0x3b && modRm) return modRm.memory ? 6 : 2;
  if (opcode >= 0x88 && opcode <= 0x8b && modRm) {
    if (!modRm.memory) return 2;
    return opcode === 0x88 || opcode === 0x89 ? 5 : 3;
  }
  if (opcode === 0x8e && modRm) return modRm.memory ? 3 : 2;
  if ((opcode === 0xf6 || opcode === 0xf7) && modRm?.reg === 0) return modRm.memory ? 6 : 3;
  if (opcode === 0xff && modRm?.reg === 4) return modRm.memory ? 11 : 7;
  if (isPushOpcode(opcode)) return withPrefixes(3, instruction);
  if (isPopOpcode(opcode)) return withPrefixes(5, instruction);
  if (opcode === 0x60) return withPrefixes(17, instruction);
  if (opcode === 0x61) return withPrefixes(19, instruction);
  if (opcode === 0x90 || (opcode >= 0x91 && opcode <= 0x97) || opcode === 0x86 || opcode === 0x87)
    return withPrefixes(3, instruction);
  if (isLoopOpcode(opcode))
    return fellThrough(instruction, beforeEip, afterEip, 1, codeDefault32) ? 4 : 8;
  if (isShortConditionalJump(opcode))
    return fellThrough(instruction, beforeEip, afterEip, 1, codeDefault32) ? 3 : 7;
  if (isNearConditionalJump(instruction))
    return fellThrough(
      instruction,
      beforeEip,
      afterEip,
      instruction.prefixes.operandSize / 8,
      codeDefault32
    )
      ? 3
      : 7;
  if (opcode === 0xea) return withPrefixes(11, instruction);
  if (opcode === 0x9a) return withPrefixes(13, instruction);
  if (opcode === 0xe8 || opcode === 0xe9 || opcode === 0xeb) return withPrefixes(7, instruction);
  if (opcode === 0xc2 || opcode === 0xc3) return withPrefixes(11, instruction);
  if (opcode === 0xca || opcode === 0xcb) return withPrefixes(15, instruction);
  if (opcode === 0xcf) return withPrefixes(17, instruction);
  if (opcode === 0xf4) return 2;
  return 2;
}

function withPrefixes(cycles: number, instruction: DecodedInstruction): number {
  void instruction;
  return cycles;
}

function isStringOpcode(opcode: number): boolean {
  return (
    (opcode >= 0x6c && opcode <= 0x6f) ||
    (opcode >= 0xa4 && opcode <= 0xa7) ||
    (opcode >= 0xaa && opcode <= 0xaf)
  );
}

function isIoOpcode(opcode: number): boolean {
  return (opcode >= 0xe4 && opcode <= 0xe7) || (opcode >= 0xec && opcode <= 0xef);
}

function isAccumulatorArithmeticImmediate(opcode: number): boolean {
  return (
    opcode === 0x04 ||
    opcode === 0x05 ||
    opcode === 0x0c ||
    opcode === 0x0d ||
    opcode === 0x14 ||
    opcode === 0x15 ||
    opcode === 0x1c ||
    opcode === 0x1d ||
    opcode === 0x24 ||
    opcode === 0x25 ||
    opcode === 0x2c ||
    opcode === 0x2d ||
    opcode === 0x34 ||
    opcode === 0x35 ||
    opcode === 0x3c ||
    opcode === 0x3d
  );
}

/**
 * PCjs's 80386 Group 7 handlers use direct timing classes for the valid
 * descriptor-table and machine-status forms.  This remains a generic opcode
 * classification; it deliberately has no knowledge of ROM addresses.
 */
function groupSevenCyclesFor(instruction: DecodedInstruction): number | undefined {
  if (instruction.opcode !== 0x0f || instruction.secondaryOpcode !== 0x01 || !instruction.modRm)
    return undefined;
  const { reg, memory } = instruction.modRm;
  if (reg === 0 || reg === 2) return memory ? 11 : undefined;
  if (reg === 1 || reg === 3) return memory ? 12 : undefined;
  if (reg === 4) return memory ? 3 : 2;
  if (reg === 6) return memory ? 6 : 3;
  return undefined;
}

/**
 * 80386 MOV-to/from-control-register forms operate on register fields even
 * when the historical 386 MOD field is not register-direct.  Timing therefore
 * depends on the opcode and CR index, never on an effective address.
 */
function controlRegisterCyclesFor(instruction: DecodedInstruction): number | undefined {
  if (!instruction.modRm || instruction.opcode !== 0x0f) return undefined;
  if (instruction.secondaryOpcode === 0x20)
    return [0, 2, 3].includes(instruction.modRm.reg) ? 6 : undefined;
  if (instruction.secondaryOpcode !== 0x22) return undefined;
  switch (instruction.modRm.reg) {
    case 0:
      return 10;
    case 2:
      return 4;
    case 3:
      return 5;
    default:
      return undefined;
  }
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

function isLoopOpcode(opcode: number): boolean {
  return opcode >= 0xe0 && opcode <= 0xe3;
}

function isShortConditionalJump(opcode: number): boolean {
  return opcode >= 0x70 && opcode <= 0x7f;
}

function isNearConditionalJump(instruction: DecodedInstruction): boolean {
  return (
    instruction.opcode === 0x0f &&
    instruction.secondaryOpcode !== undefined &&
    instruction.secondaryOpcode >= 0x80 &&
    instruction.secondaryOpcode <= 0x8f
  );
}

function fellThrough(
  instruction: DecodedInstruction,
  beforeEip: number,
  afterEip: number,
  trailingBytes: number,
  codeDefault32: boolean
): boolean {
  const next = beforeEip + instruction.length + trailingBytes;
  const fallthrough = codeDefault32 ? next >>> 0 : next & 0xffff;
  return afterEip === fallthrough;
}
