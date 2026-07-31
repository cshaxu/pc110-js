import type { NativeLockstepSnapshot } from "./native-lockstep-adapter.js";
import type { RebuiltMachineStepResult } from "../machine/rebuilt-pc-at-386-core.js";

export interface PcjsLockstepSnapshot {
  readonly version: number;
  readonly cycles: number;
  readonly paused: boolean;
  readonly memory?: {
    readonly c8000: number;
    readonly e0000: number;
  };
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
  readonly devices: {
    readonly pic: readonly {
      readonly mask: number | undefined;
      readonly request: number | undefined;
      readonly inService: number | undefined;
    }[];
    readonly pit: readonly {
      readonly reload: number;
      readonly count: number;
      readonly output: boolean;
    }[];
    readonly dma: readonly { readonly masked: boolean; readonly requested: boolean }[];
    readonly keyboardController: {
      readonly status: number;
      readonly commandByte: number;
      readonly outputBuffer: number | null;
      readonly outputDataLatch: number;
    };
    readonly rtc: {
      readonly address: number;
      readonly statusA: number;
      readonly statusB: number;
      readonly statusC: number;
      readonly statusD: number;
    };
  };
}

export interface LockstepDifference {
  readonly path: string;
  readonly native: number | boolean | string | undefined;
  readonly pcjs: number | boolean | string | undefined;
}

export interface LockstepComparison {
  readonly equal: boolean;
  readonly difference: LockstepDifference | undefined;
}

export interface LockstepBoundary {
  readonly native: {
    readonly cs: number;
    readonly eip: number;
    readonly eflags: number;
    readonly virtualCycles: string;
  };
  readonly pcjs: {
    readonly cs: number;
    readonly eip: number;
    readonly eflags: number;
    readonly virtualCycles: number;
  };
}

export interface NativeLockstepEndpoint {
  snapshot(): NativeLockstepSnapshot;
  resetMachine(): void;
  stepInstruction(): RebuiltMachineStepResult;
}

export interface PcjsLockstepReset {
  readonly accepted: boolean;
  readonly reason: string;
  readonly before: PcjsLockstepSnapshot;
  readonly after: PcjsLockstepSnapshot;
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
  resetMachine(): PcjsLockstepReset;
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
      readonly before: LockstepBoundary;
      readonly after: LockstepBoundary;
      readonly comparison: LockstepComparison;
    };

export type ControlledLockstepResetResult =
  | { readonly kind: "pcjs-not-paused"; readonly snapshot: PcjsLockstepSnapshot }
  | { readonly kind: "pcjs-reset-rejected"; readonly reset: PcjsLockstepReset }
  | {
      readonly kind: "reset";
      readonly pcjsReset: PcjsLockstepReset;
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
  const deviceDifference = compareDevices(native, pcjs);
  if (deviceDifference) return { equal: false, difference: deviceDifference };
  return { equal: true, difference: undefined };
}

function compareDevices(
  native: NativeLockstepSnapshot,
  pcjs: PcjsLockstepSnapshot
): LockstepDifference | undefined {
  for (const controller of ["master", "slave"] as const) {
    for (const field of ["mask", "request", "inService"] as const) {
      const difference = compare(
        `devices.pic.${controller}.${field}`,
        native.devices.pic[controller][field],
        pcjs.devices.pic[controller === "master" ? 0 : 1]?.[field]
      );
      if (difference) return difference;
    }
  }
  for (let index = 0; index < 3; index += 1) {
    for (const field of ["reload", "count", "output"] as const) {
      const difference = compare(
        `devices.pit.${index}.${field}`,
        native.devices.pit[index]?.[field] ?? -1,
        pcjs.devices.pit[index]?.[field] ?? -1
      );
      if (difference) return difference;
    }
  }
  for (let index = 0; index < 8; index += 1) {
    for (const field of ["masked", "requested"] as const) {
      const difference = compare(
        `devices.dma.${index}.${field}`,
        native.devices.dma[index]?.[field] ?? false,
        pcjs.devices.dma[index]?.[field] ?? false
      );
      if (difference) return difference;
    }
  }
  for (const field of ["status", "commandByte", "outputDataLatch"] as const) {
    const difference = compare(
      `devices.keyboardController.${field}`,
      native.devices.keyboardController[field],
      pcjs.devices.keyboardController[field]
    );
    if (difference) return difference;
  }
  const outputBuffer = compare(
    "devices.keyboardController.outputBuffer",
    native.devices.keyboardController.outputBuffer ?? -1,
    pcjs.devices.keyboardController.outputBuffer ?? -1
  );
  if (outputBuffer) return outputBuffer;
  for (const field of ["address", "statusA", "statusB", "statusD"] as const) {
    const difference = compare(
      `devices.rtc.${field}`,
      native.devices.rtc[field],
      pcjs.devices.rtc[field]
    );
    if (difference) return difference;
  }
  return undefined;
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

  const pcjsStep = pcjs.stepInstruction();
  if (!pcjsStep.accepted) return { kind: "pcjs-rejected", step: pcjsStep };
  const nativeStep = native.stepInstruction();
  const afterNative = native.snapshot();
  return {
    kind: "stepped",
    nativeStep,
    pcjsStep,
    before: lockstepBoundary(beforeNative, beforePcjs),
    after: lockstepBoundary(afterNative, pcjsStep.after),
    comparison: compareLockstepCpu(afterNative, pcjsStep.after)
  };
}

/** Resets both machines only through their normal diagnostic control paths. */
export function resetControlledLockstep(
  native: NativeLockstepEndpoint,
  pcjs: PcjsLockstepEndpoint
): ControlledLockstepResetResult {
  const beforePcjs = pcjs.snapshot();
  if (!beforePcjs.paused) return { kind: "pcjs-not-paused", snapshot: beforePcjs };

  const pcjsReset = pcjs.resetMachine();
  if (!pcjsReset.accepted) return { kind: "pcjs-reset-rejected", reset: pcjsReset };

  native.resetMachine();
  return {
    kind: "reset",
    pcjsReset,
    comparison: compareLockstepCpu(native.snapshot(), pcjsReset.after)
  };
}

function compare(
  path: string,
  native: number | boolean | undefined,
  pcjs: number | boolean | undefined
): LockstepDifference | undefined {
  return native === pcjs ? undefined : { path, native, pcjs };
}

function lockstepBoundary(
  native: NativeLockstepSnapshot,
  pcjs: PcjsLockstepSnapshot
): LockstepBoundary {
  return {
    native: {
      cs: native.cpu.segments.cs.selector,
      eip: native.cpu.eip,
      eflags: native.cpu.eflags,
      virtualCycles: native.virtualCycles
    },
    pcjs: {
      cs: pcjs.cpu.segments.cs.selector,
      eip: pcjs.cpu.eip,
      eflags: pcjs.cpu.eflags,
      virtualCycles: pcjs.cycles
    }
  };
}
