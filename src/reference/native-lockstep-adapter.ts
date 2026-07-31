import { NativeCoreCheckpoint } from "../app/native-core-checkpoint.js";
import type { RebuiltCpuSnapshot } from "../cpu/rebuilt/state/cpu-state.js";
import type { SegmentCache, SegmentName } from "../cpu/rebuilt/state/segments.js";
import type { RebuiltMachineStepResult } from "../machine/rebuilt-pc-at-386-core.js";

export const NATIVE_LOCKSTEP_SNAPSHOT_VERSION = 1;

export interface NativeLockstepSegmentSnapshot {
  readonly selector: number;
  readonly base: number;
  readonly limit: number;
  readonly default32: boolean;
  readonly valid: boolean;
  readonly dpl: number | undefined;
  readonly executable: boolean;
  readonly readable: boolean;
  readonly writable: boolean;
  readonly expandDown: boolean;
}

export interface NativeLockstepCpuSnapshot {
  readonly registers: RebuiltCpuSnapshot["registers"];
  readonly eip: number;
  readonly eflags: number;
  readonly halted: boolean;
  readonly cr0: number;
  readonly cr2: number;
  readonly cr3: number;
  readonly debug: readonly number[];
  readonly test: readonly number[];
  readonly gdtr: RebuiltCpuSnapshot["gdtr"];
  readonly idtr: RebuiltCpuSnapshot["idtr"];
  readonly ldtr: RebuiltCpuSnapshot["ldtr"];
  readonly tr: RebuiltCpuSnapshot["tr"];
  readonly segments: Readonly<Record<SegmentName, NativeLockstepSegmentSnapshot>>;
}

export interface NativeLockstepSnapshot {
  readonly version: typeof NATIVE_LOCKSTEP_SNAPSHOT_VERSION;
  readonly virtualCycles: string;
  readonly cpu: NativeLockstepCpuSnapshot;
}

/**
 * Diagnostic-only native control surface for a future PCjs coordinator.
 * It exposes project-native state directly and has no product runtime role.
 */
export class NativeLockstepAdapter {
  public constructor(public readonly checkpoint: NativeCoreCheckpoint) {}

  public stepInstruction(): RebuiltMachineStepResult {
    return this.checkpoint.core.step();
  }

  public snapshot(): NativeLockstepSnapshot {
    const cpu = this.checkpoint.core.runner.state.snapshot();
    return {
      version: NATIVE_LOCKSTEP_SNAPSHOT_VERSION,
      virtualCycles: this.checkpoint.core.scheduler.snapshot().cycles.toString(),
      cpu: normalizeCpu(cpu)
    };
  }
}

function normalizeCpu(cpu: RebuiltCpuSnapshot): NativeLockstepCpuSnapshot {
  return {
    registers: { ...cpu.registers },
    eip: cpu.eip,
    eflags: cpu.eflags,
    halted: cpu.halted,
    cr0: cpu.cr0,
    cr2: cpu.cr2,
    cr3: cpu.cr3,
    debug: [...cpu.debug],
    test: [...cpu.test],
    gdtr: { ...cpu.gdtr },
    idtr: { ...cpu.idtr },
    ldtr: { ...cpu.ldtr },
    tr: { ...cpu.tr },
    segments: {
      cs: normalizeSegment(cpu.segments.cs),
      ds: normalizeSegment(cpu.segments.ds),
      es: normalizeSegment(cpu.segments.es),
      ss: normalizeSegment(cpu.segments.ss),
      fs: normalizeSegment(cpu.segments.fs),
      gs: normalizeSegment(cpu.segments.gs)
    }
  };
}

function normalizeSegment(segment: SegmentCache): NativeLockstepSegmentSnapshot {
  return {
    selector: segment.selector,
    base: segment.base,
    limit: segment.limit,
    default32: segment.default32,
    valid: segment.valid ?? false,
    dpl: segment.dpl,
    executable: segment.executable ?? false,
    readable: segment.readable ?? false,
    writable: segment.writable ?? false,
    expandDown: segment.expandDown ?? false
  };
}
