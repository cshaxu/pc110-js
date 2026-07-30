import type { RebuiltTraceEvent } from "../cpu/rebuilt/debug/trace.js";
import { RebuiltCpuRunner } from "../cpu/rebuilt/runner.js";
import type { RebuiltCpuSnapshot } from "../cpu/rebuilt/state/cpu-state.js";
import type { PhysicalMemory } from "../memory/physical-memory.js";
import {
  RebuiltMachinePortBus,
  type RebuiltPortRange,
  type RebuiltPortTraceEvent
} from "./rebuilt-port-bus.js";

export interface RebuiltMachineRunResult {
  readonly executed: number;
  readonly halted: boolean;
}

export type RebuiltMachineTraceEvent =
  | { readonly kind: "instruction"; readonly event: RebuiltTraceEvent }
  | { readonly kind: "port"; readonly event: RebuiltPortTraceEvent }
  | { readonly kind: "reset"; readonly state: RebuiltCpuSnapshot };

export type RebuiltMachineTrace = (event: RebuiltMachineTraceEvent) => void;

export class RebuiltPcAt386Core {
  public readonly ports: RebuiltMachinePortBus;
  public readonly runner: RebuiltCpuRunner;

  public constructor(
    memory: PhysicalMemory,
    private readonly trace?: RebuiltMachineTrace
  ) {
    this.ports = new RebuiltMachinePortBus((event) => this.trace?.({ kind: "port", event }));
    this.runner = new RebuiltCpuRunner(memory, this.ports, (event) =>
      this.trace?.({ kind: "instruction", event })
    );
  }

  public registerPorts(range: RebuiltPortRange): void {
    this.ports.register(range);
  }

  public reset(): void {
    this.runner.reset();
    this.trace?.({ kind: "reset", state: this.runner.state.snapshot() });
  }

  public step(): void {
    this.runner.step();
  }

  public run(maxInstructions: number): RebuiltMachineRunResult {
    if (!Number.isInteger(maxInstructions) || maxInstructions < 0)
      throw new RangeError("Instruction budget must be a non-negative integer");
    let executed = 0;
    while (executed < maxInstructions && !this.runner.state.snapshot().halted) {
      this.step();
      executed += 1;
    }
    return { executed, halted: this.runner.state.snapshot().halted };
  }
}
