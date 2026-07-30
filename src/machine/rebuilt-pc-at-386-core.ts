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
  | { readonly kind: "reset"; readonly state: RebuiltCpuSnapshot }
  | {
      readonly kind: "stop";
      readonly reason: "halted" | "budget" | "error";
      readonly executed: number;
      readonly state: RebuiltCpuSnapshot;
      readonly error?: string;
    };

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
    try {
      while (executed < maxInstructions && !this.runner.state.snapshot().halted) {
        this.step();
        executed += 1;
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.trace?.({
        kind: "stop",
        reason: "error",
        executed,
        state: this.runner.state.snapshot(),
        error: detail
      });
      throw error;
    }
    const halted = this.runner.state.snapshot().halted;
    this.trace?.({
      kind: "stop",
      reason: halted ? "halted" : "budget",
      executed,
      state: this.runner.state.snapshot()
    });
    return { executed, halted };
  }
}
