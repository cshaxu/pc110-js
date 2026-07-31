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
  readonly devices: NativeLockstepDeviceSnapshot;
}

export interface NativeLockstepDeviceSnapshot {
  readonly pic: {
    readonly master: {
      readonly mask: number;
      readonly request: number;
      readonly inService: number;
    };
    readonly slave: { readonly mask: number; readonly request: number; readonly inService: number };
  };
  readonly pit: readonly {
    readonly reload: number;
    readonly count: number;
    readonly output: boolean;
  }[];
  readonly dma: readonly { readonly masked: boolean; readonly requested: boolean }[];
  readonly keyboardController: {
    readonly status: number;
    readonly commandByte: number;
    readonly outputBuffer: number | undefined;
    readonly outputDataLatch: number;
  };
  readonly rtc: {
    readonly address: number;
    readonly statusA: number;
    readonly statusB: number;
    readonly statusC: number;
    readonly statusD: number;
  };
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

  public resetMachine(): void {
    this.checkpoint.reset();
  }

  public snapshot(): NativeLockstepSnapshot {
    const cpu = this.checkpoint.core.runner.state.snapshot();
    return {
      version: NATIVE_LOCKSTEP_SNAPSHOT_VERSION,
      virtualCycles: this.checkpoint.core.scheduler.snapshot().cycles.toString(),
      cpu: normalizeCpu(cpu),
      devices: this.snapshotDevices()
    };
  }

  private snapshotDevices(): NativeLockstepDeviceSnapshot {
    const pic = this.checkpoint.core.pic.snapshot();
    const keyboardController = this.checkpoint.core.keyboardController.snapshot();
    const rtc = this.checkpoint.core.rtc.snapshot();
    const rtcState = this.checkpoint.core.rtc.capture();
    return {
      pic: {
        master: normalizePic(pic.master),
        slave: normalizePic(pic.slave)
      },
      pit: [0, 1, 2].map((index) => normalizePit(this.checkpoint.core.pit.snapshot(index))),
      dma: Array.from({ length: 8 }, (_value, index) => {
        const channel = this.checkpoint.core.dma.snapshot(index);
        return { masked: channel.masked, requested: channel.requested };
      }),
      keyboardController: {
        status: keyboardController.status,
        commandByte: keyboardController.commandByte,
        outputBuffer: keyboardController.outputBuffer,
        outputDataLatch: keyboardController.outputDataLatch
      },
      rtc: {
        address: rtcState.address,
        statusA: rtc.statusA,
        statusB: rtc.statusB,
        statusC: rtc.statusC,
        statusD: rtc.statusD
      }
    };
  }
}

function normalizePic(pic: {
  readonly mask: number;
  readonly request: number;
  readonly inService: number;
}) {
  return { mask: pic.mask, request: pic.request, inService: pic.inService };
}

function normalizePit(counter: {
  readonly reload: number;
  readonly count: number;
  readonly output: boolean;
}) {
  return { reload: counter.reload, count: counter.count, output: counter.output };
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
