import type { RebuiltTraceEvent, RebuiltTracePoint } from "../cpu/rebuilt/debug/trace.js";
import { RebuiltCpuRunner } from "../cpu/rebuilt/runner.js";
import type { RebuiltCpuSnapshot } from "../cpu/rebuilt/state/cpu-state.js";
import type { PhysicalMemory } from "../memory/physical-memory.js";
import { PcAtPic } from "../devices/pc-at-pic.js";
import { PcAtPit } from "../devices/pc-at-pit.js";
import { PcAtDma } from "../devices/pc-at-dma.js";
import { PcAtRtc } from "../devices/pc-at-rtc.js";
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

export interface RebuiltPcAt386Options {
  readonly deskProSecondaryPit?: boolean;
  readonly cycleSchedulerProfile?: CycleSchedulerProfile;
  readonly unpopulatedIo?: "strict" | "floating";
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
  public readonly keyboardController = new PcAtKeyboardController(
    (irq) => this.pic.raiseIrq(irq),
    (value) => this.writeKeyboardOutputPort(value),
    () => this.runner.reset()
  );
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

  public constructor(
    private readonly memory: PhysicalMemory,
    private readonly trace?: RebuiltMachineTrace,
    options: RebuiltPcAt386Options = {}
  ) {
    this.scheduler = new CycleScheduler(options.cycleSchedulerProfile ?? deskPro386CycleProfile);
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
    this.runner.reset();
    this.trace?.({ kind: "reset", state: this.runner.state.snapshot() });
  }

  public step(): void {
    if (this.servicePendingNmi()) return;
    if (this.servicePendingInterrupt()) return;
    if (this.runner.state.isHalted()) return;
    this.advanceExecutedInstruction(this.runner.step().cycles);
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
    this.cgaCompatibility.advance();
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
        if (this.servicePendingInterrupt()) continue;
        if (this.runner.state.isHalted()) break;
        this.advanceExecutedInstruction(this.runner.step().cycles);
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
    const halted = this.runner.state.isHalted();
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

  private advanceExecutedInstruction(cycles: number): void {
    const scheduled = this.scheduler.advance(cycles);
    if (scheduled.pitTicks > 0) this.advancePit(scheduled.pitTicks);
    if (scheduled.rtcTicks > 0) this.advanceRtc(scheduled.rtcTicks);
    if (this.dma.snapshot(2).requested) {
      const slots = this.scheduler.advanceFdcDmaSlots(
        cycles,
        this.fdc.controller.dmaBytesPerSecond()
      );
      if (slots > 0) this.advanceFdcDma(slots);
    } else this.scheduler.resetFdcDmaSlots();
    this.advanceVideo(cycles);
  }

  private servicePendingNmi(): boolean {
    if (!this.nmiPending) return false;
    this.runner.serviceNonMaskableInterrupt(2);
    this.nmiPending = false;
    this.trace?.({ kind: "interrupt", vector: 2 });
    return true;
  }
}
