import type { RebuiltTraceEvent, RebuiltTracePoint } from "../cpu/rebuilt/debug/trace.js";
import { RebuiltCpuRunner } from "../cpu/rebuilt/runner.js";
import type { RebuiltCpuSnapshot } from "../cpu/rebuilt/state/cpu-state.js";
import type { PhysicalMemory } from "../memory/physical-memory.js";
import { PcAtPic } from "../devices/pc-at-pic.js";
import { PcAtPit } from "../devices/pc-at-pit.js";
import { PcAtDma } from "../devices/pc-at-dma.js";
import { PcAtRtc } from "../devices/pc-at-rtc.js";
import type { PcAtRtcOptions } from "../devices/pc-at-rtc.js";
import { PcAtSystemControl } from "../devices/pc-at-system-control.js";
import { KeyboardOutputPort } from "../devices/keyboard-output-port.js";
import { PcAtKeyboardController } from "../devices/pc-at-keyboard-controller.js";
import { PcAtFpuControl } from "../devices/pc-at-fpu-control.js";
import { DeskPro386SecondaryPit } from "../devices/deskpro386-secondary-pit.js";
import { PcAtFdc } from "../devices/pc-at-fdc.js";
import { performDmaTransfer } from "../devices/dma-transfer.js";
import { MdaCompatibility } from "../devices/mda-compatibility.js";
import { CgaCompatibility } from "../devices/cga-compatibility.js";
import { VgaAttributeController } from "../devices/vga-attribute-controller.js";
import { VgaSequencer } from "../devices/vga-sequencer.js";
import { VgaGraphicsController } from "../devices/vga-graphics-controller.js";
import { VGA_MEMORY_SIZE, VGA_MEMORY_START, VgaMemory } from "../devices/vga-memory.js";
import { VgaCrtc } from "../devices/vga-crtc.js";
import { VgaDac } from "../devices/vga-dac.js";
import { VgaMiscellaneousOutput } from "../devices/vga-miscellaneous-output.js";
import { VgaInputStatus0 } from "../devices/vga-input-status0.js";
import { VgaFeatureControl } from "../devices/vga-feature-control.js";
import { Uart16550 } from "../devices/uart16550.js";
import { ParallelPort } from "../devices/parallel-port.js";
import { AtFixedDiskController } from "../devices/at-fixed-disk-controller.js";
import {
  CycleScheduler,
  deskPro386CycleProfile,
  type CycleSchedulerProfile
} from "./cycle-scheduler.js";
import {
  RebuiltMachinePortBus,
  type RebuiltPortRange,
  type RebuiltPortTraceEvent
} from "./rebuilt-port-bus.js";

export interface RebuiltMachineRunResult {
  readonly executed: number;
  readonly halted: boolean;
}

export interface RebuiltMachineUntilResult extends RebuiltMachineRunResult {
  readonly reached: boolean;
}

/** Result of one machine boundary for diagnostic stepping. */
export type RebuiltMachineStepResult =
  | { readonly kind: "instruction"; readonly cycles: number }
  | { readonly kind: "nmi"; readonly cycles: 0; readonly vector: 2 }
  | { readonly kind: "interrupt"; readonly cycles: 0; readonly vector: number }
  | { readonly kind: "halted"; readonly cycles: 0 };

export interface RebuiltPcAt386Options {
  readonly deskProSecondaryPit?: boolean;
  /** ROM-evidenced 8042 interface-test result for a selected machine profile. */
  readonly keyboardInterfaceTestResult?: number;
  readonly cycleSchedulerProfile?: CycleSchedulerProfile;
  readonly unpopulatedIo?: "strict" | "floating";
  /** Optional RTC seed/configuration selected by a machine profile. */
  readonly rtc?: PcAtRtcOptions;
  /** Selects eligible full instruction snapshots for an attached machine trace. */
  readonly instructionTraceSelector?: (point: RebuiltTracePoint) => boolean;
  /** Retains machine I/O and stop events without enabling CPU instruction tracing. */
  readonly instructionTrace?: boolean;
}

export type RebuiltMachineTraceEvent =
  | { readonly kind: "instruction"; readonly event: RebuiltTraceEvent }
  | { readonly kind: "port"; readonly event: RebuiltPortTraceEvent }
  | { readonly kind: "interrupt"; readonly vector: number }
  | { readonly kind: "reset"; readonly state: RebuiltCpuSnapshot }
  | {
      readonly kind: "stop";
      readonly reason: "halted" | "budget" | "checkpoint" | "error";
      readonly executed: number;
      readonly state: RebuiltCpuSnapshot;
      readonly error?: string;
    };

export type RebuiltMachineTrace = (event: RebuiltMachineTraceEvent) => void;

/** One in-memory diagnostic replay point for the project-native machine core. */
export interface RebuiltPcAt386CoreState {
  readonly cpu: RebuiltCpuSnapshot;
  readonly runner: ReturnType<RebuiltCpuRunner["capture"]>;
  readonly memory: ReturnType<PhysicalMemory["capture"]>;
  readonly scheduler: ReturnType<CycleScheduler["capture"]>;
  readonly keyboardOutputPort: number;
  readonly pic: ReturnType<PcAtPic["capture"]>;
  readonly pit: ReturnType<PcAtPit["capture"]>;
  readonly dma: ReturnType<PcAtDma["capture"]>;
  readonly rtc: ReturnType<PcAtRtc["capture"]>;
  readonly systemPort: ReturnType<PcAtSystemControl["capture"]>;
  readonly keyboardController: ReturnType<PcAtKeyboardController["capture"]>;
  readonly fpuControl: ReturnType<PcAtFpuControl["capture"]>;
  readonly fdc: ReturnType<PcAtFdc["capture"]>;
  readonly com1: ReturnType<Uart16550["capture"]>;
  readonly com2: ReturnType<Uart16550["capture"]>;
  readonly lpt1: ReturnType<ParallelPort["capture"]>;
  readonly hdc: ReturnType<AtFixedDiskController["capture"]>;
  readonly mdaCompatibility: ReturnType<MdaCompatibility["capture"]>;
  readonly cgaCompatibility: ReturnType<CgaCompatibility["capture"]>;
  readonly attributeController: ReturnType<VgaAttributeController["capture"]>;
  readonly sequencer: ReturnType<VgaSequencer["capture"]>;
  readonly graphicsController: ReturnType<VgaGraphicsController["capture"]>;
  readonly vgaMemory: ReturnType<VgaMemory["capture"]>;
  readonly crtc: ReturnType<VgaCrtc["capture"]>;
  readonly dac: ReturnType<VgaDac["capture"]>;
  readonly featureControl: ReturnType<VgaFeatureControl["capture"]>;
  readonly miscellaneousOutput: ReturnType<VgaMiscellaneousOutput["capture"]>;
  readonly deskProSecondaryPit: ReturnType<DeskPro386SecondaryPit["capture"]> | undefined;
  readonly nmiPending: boolean;
  readonly pendingDeviceWork: PendingDeviceWork | undefined;
}

interface PendingDeviceWork {
  readonly cycles: number;
  readonly pitTicks: number;
  readonly rtcTicks: number;
  readonly fdcDmaSlots: number;
}

export class RebuiltPcAt386Core {
  public readonly keyboardOutputPort = new KeyboardOutputPort();
  public readonly pic = new PcAtPic();
  public readonly pit = new PcAtPit((irq) => this.pic.raiseIrq(irq));
  public readonly dma = new PcAtDma();
  public readonly rtc: PcAtRtc;
  public readonly systemPort = new PcAtSystemControl(this.pit);
  public readonly keyboardController: PcAtKeyboardController;
  public readonly fpuControl = new PcAtFpuControl();
  public readonly fdc = new PcAtFdc(
    (irq) => this.pic.raiseIrq(irq),
    (active) => this.dma.setHardwareRequest(2, active)
  );
  public readonly com1 = new Uart16550({ onInterrupt: (active) => active && this.pic.raiseIrq(4) });
  public readonly com2 = new Uart16550({
    basePort: 0x2f8,
    onInterrupt: (active) => active && this.pic.raiseIrq(3)
  });
  public readonly lpt1 = new ParallelPort({
    onInterrupt: (active) => active && this.pic.raiseIrq(7)
  });
  public readonly hdc = new AtFixedDiskController((active) => active && this.pic.raiseIrq(14));
  public readonly mdaCompatibility = new MdaCompatibility();
  public readonly attributeController = new VgaAttributeController();
  public readonly sequencer = new VgaSequencer();
  public readonly graphicsController = new VgaGraphicsController();
  public readonly vgaMemory = new VgaMemory(this.sequencer, this.graphicsController);
  public readonly crtc = new VgaCrtc();
  public readonly dac = new VgaDac();
  public readonly inputStatus0 = new VgaInputStatus0(this.dac);
  public readonly featureControl = new VgaFeatureControl();
  public readonly miscellaneousOutput = new VgaMiscellaneousOutput();
  public readonly cgaCompatibility = new CgaCompatibility(
    () => this.attributeController.resetAddressDataFlipFlop(),
    false
  );
  public readonly deskProSecondaryPit: DeskPro386SecondaryPit | undefined;
  public readonly ports: RebuiltMachinePortBus;
  public readonly runner: RebuiltCpuRunner;
  public readonly scheduler: CycleScheduler;
  private nmiPending = false;
  private readonly cycleSchedulerProfile: CycleSchedulerProfile;
  private readonly pitCpuCyclesPerSecond: number;
  private readonly pitTicksPerSecond: number;
  private pendingDeviceWork: PendingDeviceWork | undefined;

  public constructor(
    private readonly memory: PhysicalMemory,
    private readonly trace?: RebuiltMachineTrace,
    options: RebuiltPcAt386Options = {}
  ) {
    this.rtc = new PcAtRtc(options.rtc, (irq) => this.pic.raiseIrq(irq));
    this.keyboardController = new PcAtKeyboardController(
      (irq) => this.pic.raiseIrq(irq),
      (value) => this.writeKeyboardOutputPort(value),
      () => this.runner.reset(),
      { interfaceTestResult: options.keyboardInterfaceTestResult }
    );
    this.cycleSchedulerProfile = options.cycleSchedulerProfile ?? deskPro386CycleProfile;
    this.pitCpuCyclesPerSecond = numberFrequency(
      this.cycleSchedulerProfile.cpuCyclesPerSecond,
      "CPU"
    );
    this.pitTicksPerSecond = numberFrequency(this.cycleSchedulerProfile.pitTicksPerSecond, "PIT");
    this.scheduler = new CycleScheduler(this.cycleSchedulerProfile);
    this.ports = new RebuiltMachinePortBus(
      (event) => this.trace?.({ kind: "port", event }),
      options.unpopulatedIo === "floating"
        ? { unmappedRead: "ff", unmappedWrite: "ignore" }
        : undefined
    );
    this.runner = new RebuiltCpuRunner(
      memory,
      this.ports,
      this.trace && options.instructionTrace !== false
        ? {
            onTrace: (event) => this.trace?.({ kind: "instruction", event }),
            shouldCapture: options.instructionTraceSelector
          }
        : undefined
    );
    this.memory.mapDevice(VGA_MEMORY_START, VGA_MEMORY_SIZE, this.vgaMemory);
    for (const range of this.pic.portRanges()) this.registerPorts(range);
    for (const range of this.pit.portRanges()) this.registerPorts(range);
    for (const range of this.dma.portRanges()) this.registerPorts(range);
    for (const range of this.rtc.portRanges()) this.registerPorts(range);
    for (const range of this.systemPort.portRanges()) this.registerPorts(range);
    for (const range of this.keyboardController.portRanges()) this.registerPorts(range);
    for (const range of this.fpuControl.portRanges()) this.registerPorts(range);
    for (const range of this.fdc.portRanges()) this.registerPorts(range);
    for (const range of this.com1.portRanges()) this.registerPorts(range);
    for (const range of this.com2.portRanges()) this.registerPorts(range);
    for (const range of this.lpt1.portRanges()) this.registerPorts(range);
    for (const range of this.hdc.portRanges()) this.registerPorts(range);
    for (const range of this.mdaCompatibility.portRanges()) this.registerPorts(range);
    for (const range of this.cgaCompatibility.portRanges()) this.registerPorts(range);
    for (const range of this.crtc.portRanges()) this.registerPorts(range);
    for (const range of this.dac.portRanges()) this.registerPorts(range);
    for (const range of this.inputStatus0.portRanges()) this.registerPorts(range);
    for (const range of this.featureControl.portRanges()) this.registerPorts(range);
    for (const range of this.miscellaneousOutput.portRanges()) this.registerPorts(range);
    for (const range of this.attributeController.portRanges()) this.registerPorts(range);
    for (const range of this.sequencer.portRanges()) this.registerPorts(range);
    for (const range of this.graphicsController.portRanges()) this.registerPorts(range);
    if (options.deskProSecondaryPit) {
      this.deskProSecondaryPit = new DeskPro386SecondaryPit();
      for (const range of this.deskProSecondaryPit.portRanges()) this.registerPorts(range);
    }
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
    this.keyboardController.reset();
    this.fpuControl.reset();
    this.fdc.reset();
    this.com1.reset();
    this.com2.reset();
    this.lpt1.reset();
    this.hdc.reset();
    this.mdaCompatibility.reset();
    this.cgaCompatibility.reset();
    this.attributeController.reset();
    this.sequencer.reset();
    this.graphicsController.reset();
    this.vgaMemory.reset();
    this.crtc.reset();
    this.dac.reset();
    this.featureControl.reset();
    this.miscellaneousOutput.reset();
    this.deskProSecondaryPit?.reset();
    this.keyboardOutputPort.reset();
    this.scheduler.reset();
    this.memory.setA20Enabled(true);
    this.nmiPending = false;
    this.pendingDeviceWork = undefined;
    this.runner.reset();
    this.trace?.({ kind: "reset", state: this.runner.state.snapshot() });
  }

  public capture(): RebuiltPcAt386CoreState {
    return {
      cpu: this.runner.state.snapshot(),
      runner: this.runner.capture(),
      memory: this.memory.capture(),
      scheduler: this.scheduler.capture(),
      keyboardOutputPort: this.keyboardOutputPort.capture(),
      pic: this.pic.capture(),
      pit: this.pit.capture(),
      dma: this.dma.capture(),
      rtc: this.rtc.capture(),
      systemPort: this.systemPort.capture(),
      keyboardController: this.keyboardController.capture(),
      fpuControl: this.fpuControl.capture(),
      fdc: this.fdc.capture(),
      com1: this.com1.capture(),
      com2: this.com2.capture(),
      lpt1: this.lpt1.capture(),
      hdc: this.hdc.capture(),
      mdaCompatibility: this.mdaCompatibility.capture(),
      cgaCompatibility: this.cgaCompatibility.capture(),
      attributeController: this.attributeController.capture(),
      sequencer: this.sequencer.capture(),
      graphicsController: this.graphicsController.capture(),
      vgaMemory: this.vgaMemory.capture(),
      crtc: this.crtc.capture(),
      dac: this.dac.capture(),
      featureControl: this.featureControl.capture(),
      miscellaneousOutput: this.miscellaneousOutput.capture(),
      deskProSecondaryPit: this.deskProSecondaryPit?.capture(),
      nmiPending: this.nmiPending,
      pendingDeviceWork: this.pendingDeviceWork
    };
  }

  public restore(state: RebuiltPcAt386CoreState): void {
    if ((state.deskProSecondaryPit === undefined) !== (this.deskProSecondaryPit === undefined))
      throw new RangeError("Machine checkpoint configuration changed since capture");
    this.memory.restore(state.memory);
    this.runner.state.restore(state.cpu);
    this.runner.restore(state.runner);
    this.scheduler.restore(state.scheduler);
    this.keyboardOutputPort.restore(state.keyboardOutputPort);
    this.pit.restore(state.pit);
    this.systemPort.restore(state.systemPort);
    this.rtc.restore(state.rtc);
    this.keyboardController.restore(state.keyboardController);
    this.fpuControl.restore(state.fpuControl);
    this.fdc.restore(state.fdc);
    this.dma.restore(state.dma);
    this.com1.restore(state.com1);
    this.com2.restore(state.com2);
    this.lpt1.restore(state.lpt1);
    this.hdc.restore(state.hdc);
    this.mdaCompatibility.restore(state.mdaCompatibility);
    this.cgaCompatibility.restore(state.cgaCompatibility);
    this.attributeController.restore(state.attributeController);
    this.sequencer.restore(state.sequencer);
    this.graphicsController.restore(state.graphicsController);
    this.vgaMemory.restore(state.vgaMemory);
    this.crtc.restore(state.crtc);
    this.dac.restore(state.dac);
    this.featureControl.restore(state.featureControl);
    this.miscellaneousOutput.restore(state.miscellaneousOutput);
    this.deskProSecondaryPit?.restore(state.deskProSecondaryPit!);
    this.pic.restore(state.pic);
    this.nmiPending = state.nmiPending;
    this.pendingDeviceWork = state.pendingDeviceWork;
  }

  public step(): RebuiltMachineStepResult {
    this.settlePendingDeviceWork();
    if (this.servicePendingNmi()) return { kind: "nmi", cycles: 0, vector: 2 };
    const interrupt = this.servicePendingInterrupt();
    if (interrupt !== undefined) return { kind: "interrupt", cycles: 0, vector: interrupt };
    if (this.runner.state.isHalted()) return { kind: "halted", cycles: 0 };
    const result = this.runner.step();
    this.queueExecutedInstruction(result.cycles);
    return { kind: "instruction", cycles: result.cycles };
  }

  public advancePit(ticks: number): void {
    this.pit.advance(ticks);
    this.deskProSecondaryPit?.advance(ticks);
  }

  public advanceRtc(ticks: number): void {
    this.rtc.advance(ticks);
  }

  /** Advances project-native video compatibility timing independently of rendering. */
  public advanceVideo(cycles: number): void {
    if (!Number.isInteger(cycles) || cycles < 0)
      throw new RangeError("Video cycle charge must be a non-negative integer");
    this.mdaCompatibility.advance(cycles);
    this.cgaCompatibility.advance(cycles);
  }

  public advanceFdcDma(maxTransfers: number): number {
    if (!Number.isInteger(maxTransfers) || maxTransfers < 0)
      throw new RangeError("FDC DMA transfer budget must be a non-negative integer");
    let transfers = 0;
    while (transfers < maxTransfers) {
      const grant = this.dma.grant();
      if (!grant) break;
      if (grant.channel !== 2 || grant.transferType !== "write" || grant.unitBytes !== 1)
        throw new Error("FDC DMA requires an 8-bit DMA2 device-to-memory grant");
      const byte = this.fdc.controller.readDmaByte();
      if (byte === undefined) {
        this.dma.setHardwareRequest(2, false);
        break;
      }
      performDmaTransfer(
        grant,
        {
          read8: (address) => this.memory.readUint8(address),
          write8: (address, value) => this.memory.writeUint8(address, value)
        },
        { read8: () => byte, write8: () => undefined }
      );
      transfers += 1;
      if (grant.terminalCount || this.fdc.controller.snapshot().dmaBytesPending === 0) {
        this.fdc.completeDma(grant.terminalCount);
        this.dma.setHardwareRequest(2, false);
        break;
      }
    }
    return transfers;
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

  public receiveKeyboardByte(value: number): boolean {
    return this.keyboardController.receiveKeyboardByte(value);
  }

  public run(maxInstructions: number): RebuiltMachineRunResult {
    if (!Number.isInteger(maxInstructions) || maxInstructions < 0)
      throw new RangeError("Instruction budget must be a non-negative integer");
    let executed = 0;
    try {
      while (executed < maxInstructions) {
        const result = this.step();
        if (result.kind === "instruction") executed += 1;
        else if (result.kind === "halted") break;
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
    this.settlePendingDeviceWork();
    const halted = this.runner.state.isHalted();
    this.trace?.({
      kind: "stop",
      reason: halted ? "halted" : "budget",
      executed,
      state: this.runner.state.snapshot()
    });
    return { executed, halted };
  }

  /** Runs without instruction tracing until an instruction-boundary predicate matches. */
  public runUntil(maxInstructions: number, predicate: () => boolean): RebuiltMachineUntilResult {
    if (!Number.isInteger(maxInstructions) || maxInstructions < 0)
      throw new RangeError("Instruction budget must be a non-negative integer");
    let executed = 0;
    try {
      while (executed < maxInstructions) {
        if (predicate()) {
          const state = this.runner.state.snapshot();
          this.trace?.({ kind: "stop", reason: "checkpoint", executed, state });
          return { executed, halted: state.halted, reached: true };
        }
        const result = this.step();
        if (result.kind === "instruction") executed += 1;
        else if (result.kind === "halted") break;
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
    this.settlePendingDeviceWork();
    const halted = this.runner.state.isHalted();
    this.trace?.({
      kind: "stop",
      reason: halted ? "halted" : "budget",
      executed,
      state: this.runner.state.snapshot()
    });
    return { executed, halted, reached: false };
  }

  private servicePendingInterrupt(): number | undefined {
    const vector = this.pic.pendingVector();
    if (vector === undefined || !this.runner.serviceExternalInterrupt(vector)) return undefined;
    const acknowledged = this.pic.acknowledge();
    if (acknowledged !== vector)
      throw new Error("PC/AT PIC acknowledgement changed after CPU interrupt admission");
    this.trace?.({ kind: "interrupt", vector });
    return vector;
  }

  private queueExecutedInstruction(cycles: number): void {
    const scheduled = this.scheduler.advance(cycles);
    const fdcDmaSlots = this.dma.snapshot(2).requested
      ? this.scheduler.advanceFdcDmaSlots(cycles, this.fdc.controller.dmaBytesPerSecond())
      : 0;
    if (!this.dma.snapshot(2).requested) this.scheduler.resetFdcDmaSlots();
    this.pendingDeviceWork = {
      cycles,
      pitTicks: scheduled.pitTicks,
      rtcTicks: scheduled.rtcTicks,
      fdcDmaSlots
    };
  }

  private settlePendingDeviceWork(): void {
    const work = this.pendingDeviceWork;
    if (!work) return;
    this.pendingDeviceWork = undefined;
    this.pit.advanceCycles(work.cycles, this.pitCpuCyclesPerSecond, this.pitTicksPerSecond);
    if (work.pitTicks > 0) this.deskProSecondaryPit?.advance(work.pitTicks);
    if (work.rtcTicks > 0) this.advanceRtc(work.rtcTicks);
    if (work.fdcDmaSlots > 0) this.advanceFdcDma(work.fdcDmaSlots);
    this.advanceVideo(work.cycles);
  }

  private servicePendingNmi(): boolean {
    if (!this.nmiPending) return false;
    this.runner.serviceNonMaskableInterrupt(2);
    this.nmiPending = false;
    this.trace?.({ kind: "interrupt", vector: 2 });
    return true;
  }
}

function numberFrequency(value: bigint, name: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError(`${name} frequency exceeds the safe integer range`);
  return Number(value);
}
