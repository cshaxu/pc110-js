import type { NativeLockstepSnapshot } from "./native-lockstep-adapter.js";
import type { RebuiltMachineStepResult } from "../machine/rebuilt-pc-at-386-core.js";

export interface PcjsLockstepSnapshot {
  readonly version: number;
  readonly cycles: number;
  readonly paused: boolean;
  readonly cpu: {
    readonly registers: Record<
      "eax" | "ecx" | "edx" | "ebx" | "esp" | "ebp" | "esi" | "edi",
      number
    >;
    readonly eip: number;
    readonly eflags: number;
    readonly cr0: number;
    readonly cr2: number;
    readonly cr3: number;
    readonly segments: Record<
      "cs" | "ds" | "es" | "ss" | "fs" | "gs",
      {
        readonly selector: number;
        readonly base: number;
        readonly limit: number;
        readonly default32: boolean;
      }
    >;
  };
}

export interface LockstepDifference {
  readonly path: string;
  readonly native: number | boolean | string;
  readonly pcjs: number | boolean | string;
}

export interface LockstepComparison {
  readonly equal: boolean;
  readonly difference: LockstepDifference | undefined;
}

export interface NativeLockstepEndpoint {
  snapshot(): NativeLockstepSnapshot;
  stepInstruction(): RebuiltMachineStepResult;
}

export interface PcjsLockstepStep {
  readonly accepted: boolean;
  readonly reason: string;
  readonly cyclesConsumed: number;
  readonly before: PcjsLockstepSnapshot;
  readonly after: PcjsLockstepSnapshot;
}

export interface PcjsLockstepEndpoint {
  snapshot(): PcjsLockstepSnapshot;
  stepInstruction(): PcjsLockstepStep;
}

export type ControlledLockstepResult =
  | { readonly kind: "precondition-difference"; readonly comparison: LockstepComparison }
  | { readonly kind: "pcjs-not-paused"; readonly snapshot: PcjsLockstepSnapshot }
  | { readonly kind: "pcjs-rejected"; readonly step: PcjsLockstepStep }
  | {
      readonly kind: "stepped";
      readonly nativeStep: RebuiltMachineStepResult;
      readonly pcjsStep: PcjsLockstepStep;
      readonly comparison: LockstepComparison;
    };

const REGISTER_NAMES = ["eax", "ecx", "edx", "ebx", "esp", "ebp", "esi", "edi"] as const;
const SEGMENT_NAMES = ["cs", "ds", "es", "ss", "fs", "gs"] as const;

/**
 * Compares only established architectural fields. Device journals and reset
 * equivalence remain coordinator inputs once both sides can provide them.
 */
export function compareLockstepCpu(
  native: NativeLockstepSnapshot,
  pcjs: PcjsLockstepSnapshot
): LockstepComparison {
  for (const name of REGISTER_NAMES) {
    const difference = compare(
      `cpu.registers.${name}`,
      native.cpu.registers[name],
      pcjs.cpu.registers[name]
    );
    if (difference) return { equal: false, difference };
  }
  for (const field of ["eip", "eflags", "cr0", "cr2", "cr3"] as const) {
    const difference = compare(`cpu.${field}`, native.cpu[field], pcjs.cpu[field]);
    if (difference) return { equal: false, difference };
  }
  for (const name of SEGMENT_NAMES) {
    for (const field of ["selector", "base", "limit", "default32"] as const) {
      const difference = compare(
        `cpu.segments.${name}.${field}`,
        native.cpu.segments[name][field],
        pcjs.cpu.segments[name][field]
      );
      if (difference) return { equal: false, difference };
    }
  }
  return { equal: true, difference: undefined };
}

/** Advances both endpoints only after their established CPU state matches. */
export function stepControlledLockstep(
  native: NativeLockstepEndpoint,
  pcjs: PcjsLockstepEndpoint
): ControlledLockstepResult {
  const beforeNative = native.snapshot();
  const beforePcjs = pcjs.snapshot();
  if (!beforePcjs.paused) return { kind: "pcjs-not-paused", snapshot: beforePcjs };
  const before = compareLockstepCpu(beforeNative, beforePcjs);
  if (!before.equal) return { kind: "precondition-difference", comparison: before };

  const nativeStep = native.stepInstruction();
  const pcjsStep = pcjs.stepInstruction();
  if (!pcjsStep.accepted) return { kind: "pcjs-rejected", step: pcjsStep };
  return {
    kind: "stepped",
    nativeStep,
    pcjsStep,
    comparison: compareLockstepCpu(native.snapshot(), pcjsStep.after)
  };
}

function compare(
  path: string,
  native: number | boolean,
  pcjs: number | boolean
): LockstepDifference | undefined {
  return native === pcjs ? undefined : { path, native, pcjs };
}
