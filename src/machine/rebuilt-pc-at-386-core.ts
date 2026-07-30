import type { RebuiltTraceEvent } from "../cpu/rebuilt/debug/trace.js";
import { RebuiltCpuRunner } from "../cpu/rebuilt/runner.js";
import type { RebuiltCpuSnapshot } from "../cpu/rebuilt/state/cpu-state.js";
import type { PhysicalMemory } from "../memory/physical-memory.js";
import { PcAtPic } from "../devices/pc-at-pic.js";
import { PcAtPit } from "../devices/pc-at-pit.js";
import { PcAtDma } from "../devices/pc-at-dma.js";
import { PcAtRtc } from "../devices/pc-at-rtc.js";
import { PcAtSystemControl } from "../devices/pc-at-system-control.js";
import { KeyboardOutputPort } from "../devices/keyboard-output-port.js";
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
  | { readonly kind: "interrupt"; readonly vector: number }
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
  public readonly keyboardOutputPort = new KeyboardOutputPort();
  public readonly pic = new PcAtPic();
  public readonly pit = new PcAtPit((irq) => this.pic.raiseIrq(irq));
  public readonly dma = new PcAtDma();
  public readonly rtc = new PcAtRtc({}, (irq) => this.pic.raiseIrq(irq));
  public readonly systemPort = new PcAtSystemControl(this.pit);
  public readonly ports: RebuiltMachinePortBus;
  public readonly runner: RebuiltCpuRunner;
  private nmiPending = false;

  public constructor(
    private readonly memory: PhysicalMemory,
    private readonly trace?: RebuiltMachineTrace
  ) {
    this.ports = new RebuiltMachinePortBus((event) => this.trace?.({ kind: "port", event }));
    this.runner = new RebuiltCpuRunner(memory, this.ports, (event) =>
      this.trace?.({ kind: "instruction", event })
    );
    for (const range of this.pic.portRanges()) this.registerPorts(range);
    for (const range of this.pit.portRanges()) this.registerPorts(range);
    for (const range of this.dma.portRanges()) this.registerPorts(range);
    for (const range of this.rtc.portRanges()) this.registerPorts(range);
    for (const range of this.systemPort.portRanges()) this.registerPorts(range);
  }

  public registerPorts(range: RebuiltPortRange): void {
    this.ports.register(range);
  }

  public reset(): void {
    this.pic.reset();
    this.pit.reset();
    this.dma.reset();
    this.rtc.reset();
    this.systemPort.reset();
    this.keyboardOutputPort.reset();
    this.memory.setA20Enabled(true);
    this.nmiPending = false;
    this.runner.reset();
    this.trace?.({ kind: "reset", state: this.runner.state.snapshot() });
  }

  public step(): void {
    if (this.servicePendingNmi()) return;
    if (this.servicePendingInterrupt()) return;
    if (this.runner.state.isHalted()) return;
    this.runner.step();
  }

  public advancePit(ticks: number): void {
    this.pit.advance(ticks);
  }

  public advanceRtc(ticks: number): void {
    this.rtc.advance(ticks);
  }

  public requestNmi(): boolean {
    if (this.rtc.nmiDisabled()) return false;
    this.nmiPending = true;
    return true;
  }

  public writeKeyboardOutputPort(value: number): void {
    const update = this.keyboardOutputPort.write(value);
    this.memory.setA20Enabled(update.a20Enabled);
    if (update.resetRequested) this.runner.reset();
  }

  public run(maxInstructions: number): RebuiltMachineRunResult {
    if (!Number.isInteger(maxInstructions) || maxInstructions < 0)
      throw new RangeError("Instruction budget must be a non-negative integer");
    let executed = 0;
    try {
      while (executed < maxInstructions) {
        if (this.servicePendingInterrupt()) continue;
        if (this.runner.state.snapshot().halted) break;
        this.runner.step();
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

  private servicePendingInterrupt(): boolean {
    const vector = this.pic.pendingVector();
    if (vector === undefined || !this.runner.serviceExternalInterrupt(vector)) return false;
    const acknowledged = this.pic.acknowledge();
    if (acknowledged !== vector)
      throw new Error("PC/AT PIC acknowledgement changed after CPU interrupt admission");
    this.trace?.({ kind: "interrupt", vector });
    return true;
  }

  private servicePendingNmi(): boolean {
    if (!this.nmiPending) return false;
    this.runner.serviceNonMaskableInterrupt(2);
    this.nmiPending = false;
    this.trace?.({ kind: "interrupt", vector: 2 });
    return true;
  }
}
