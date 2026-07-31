import {
  RebuiltPcAt386Core,
  type RebuiltMachineTraceEvent
} from "../machine/rebuilt-pc-at-386-core.js";
import type { PhysicalMemory } from "../memory/physical-memory.js";
import { VgaTextFramebuffer } from "../devices/vga-text-framebuffer.js";
import { createRomImage } from "../firmware/rom-image.js";
import { FLOPPY_1440K_GEOMETRY, FloppyDrive } from "../devices/floppy-drive.js";
import { createDeskPro386Memory } from "../machine/configurations/deskpro386-memory.js";

const PORT_EVENT_CAPACITY = 16;
const KEYBOARD_PORT_EVENT_CAPACITY = 16;
const KEYBOARD_COMMAND_WRITE_CAPACITY = 16;
const BDA_KEYBOARD_HEAD = 0x41a;
const BDA_KEYBOARD_TAIL = 0x41c;

export interface NativeCoreCheckpointSnapshot {
  readonly codeAddress: string;
  readonly masterRequest: string;
  readonly masterInService: string;
  readonly masterMask: string;
  readonly slaveRequest: string;
  readonly slaveInService: string;
  readonly slaveMask: string;
  readonly timer0Output: string;
  readonly timer2Output: string;
  readonly dma0Masks: string;
  readonly dma1Masks: string;
  readonly fdcPhase: string;
  readonly fdcMainStatus: string;
  readonly fdcInterruptPending: string;
  readonly fdcDmaBytesPending: string;
  readonly fdcDrive0Ready: string;
  readonly fdcDrive0Cylinder: string;
  readonly rtcStatusA: string;
  readonly rtcStatusB: string;
  readonly rtcStatusC: string;
  readonly rtcStatusD: string;
  readonly rtcNmiDisabled: string;
  readonly systemPortControl: string;
  readonly systemTimer2Gate: string;
  readonly systemSpeakerOutput: string;
  readonly a20Enabled: string;
  readonly keyboardControllerStatus: string;
  readonly keyboardControllerCommandByte: string;
  readonly keyboardControllerOutputBuffer: string;
  readonly keyboardControllerKeyboardEnabled: string;
  readonly keyboardScanningEnabled: string;
  readonly bdaKeyboardHead: string;
  readonly bdaKeyboardTail: string;
  readonly recentKeyboardControllerWrites: string;
  readonly recentKeyboardControllerPortEvents: string;
  readonly recentPortEvents: string;
}

export class NativeCoreCheckpoint {
  private readonly recentPortEvents: string[] = [];
  private readonly recentKeyboardControllerPortEvents: string[] = [];
  private readonly recentKeyboardControllerWrites: string[] = [];
  public readonly memory = createDeskPro386Memory();
  public readonly core = new RebuiltPcAt386Core(
    this.memory,
    (event) => this.recordMachineEvent(event),
    {
      deskProSecondaryPit: true,
      unpopulatedIo: "floating",
      instructionTrace: false
    }
  );
  public readonly textFramebuffer = new VgaTextFramebuffer(
    this.core.vgaMemory,
    this.core.crtc,
    this.core.dac
  );

  public reset(): void {
    this.recentPortEvents.length = 0;
    this.recentKeyboardControllerPortEvents.length = 0;
    this.recentKeyboardControllerWrites.length = 0;
    this.core.reset();
  }

  public mapSystemRom(bytes: Uint8Array): void {
    this.memory.mapRom(
      createRomImage("system-rom", bytes),
      0xffff8000,
      [0xf8000, 0xf0000, 0xffff0000]
    );
  }

  public mapVgaRom(bytes: Uint8Array): void {
    this.memory.mapRom(createRomImage("vga-rom", bytes), 0xc0000);
  }

  public attachFloppy(bytes: Uint8Array): void {
    const drive = new FloppyDrive(FLOPPY_1440K_GEOMETRY);
    drive.attach(bytes);
    this.core.fdc.controller.attachDrive(0, drive);
  }

  public snapshot(): NativeCoreCheckpointSnapshot {
    const cpu = this.core.runner.state.snapshot();
    const pic = this.core.pic.snapshot();
    const keyboardController = this.core.keyboardController.snapshot();
    const fdc = this.core.fdc.controller.snapshot();
    const fdcDrive0 = fdc.drives[0];
    return {
      codeAddress: `${hex16(cpu.segments.cs.selector)}:${hex16(cpu.eip)}`,
      masterRequest: hex8(pic.master.request),
      masterInService: hex8(pic.master.inService),
      masterMask: hex8(pic.master.mask),
      slaveRequest: hex8(pic.slave.request),
      slaveInService: hex8(pic.slave.inService),
      slaveMask: hex8(pic.slave.mask),
      timer0Output: bit(this.core.pit.snapshot(0).output),
      timer2Output: bit(this.core.pit.counter2Output()),
      dma0Masks: hex8(this.core.dma.maskBits(0)),
      dma1Masks: hex8(this.core.dma.maskBits(1)),
      fdcPhase: fdc.phase,
      fdcMainStatus: hex8(fdc.mainStatus),
      fdcInterruptPending: bit(fdc.interruptPending),
      fdcDmaBytesPending: String(fdc.dmaBytesPending),
      fdcDrive0Ready: bit(fdcDrive0?.ready ?? false),
      fdcDrive0Cylinder: String(fdcDrive0?.cylinder ?? 0),
      rtcStatusA: hex8(this.core.rtc.snapshot().statusA),
      rtcStatusB: hex8(this.core.rtc.snapshot().statusB),
      rtcStatusC: hex8(this.core.rtc.snapshot().statusC),
      rtcStatusD: hex8(this.core.rtc.snapshot().statusD),
      rtcNmiDisabled: bit(this.core.rtc.nmiDisabled()),
      systemPortControl: hex8(this.core.systemPort.snapshot().control),
      systemTimer2Gate: bit(this.core.systemPort.snapshot().timer2Gate),
      systemSpeakerOutput: bit(this.core.systemPort.speakerOutput()),
      a20Enabled: bit(this.core.keyboardOutputPort.snapshot().a20Enabled),
      keyboardControllerStatus: hex8(keyboardController.status),
      keyboardControllerCommandByte: hex8(keyboardController.commandByte),
      keyboardControllerOutputBuffer:
        keyboardController.outputBuffer === undefined
          ? "--"
          : hex8(keyboardController.outputBuffer),
      keyboardControllerKeyboardEnabled: bit(keyboardController.keyboardEnabled),
      keyboardScanningEnabled: bit(this.core.keyboardController.keyboard.canTransmitScanCodes()),
      bdaKeyboardHead: hex16(readUint16(this.memory, BDA_KEYBOARD_HEAD)),
      bdaKeyboardTail: hex16(readUint16(this.memory, BDA_KEYBOARD_TAIL)),
      recentKeyboardControllerWrites: this.recentKeyboardControllerWrites.join(" ") || "--",
      recentKeyboardControllerPortEvents: this.recentKeyboardControllerPortEvents.join(" ") || "--",
      recentPortEvents: this.recentPortEvents.join(" ") || "--"
    };
  }

  private recordMachineEvent(event: RebuiltMachineTraceEvent): void {
    if (event.kind !== "port") return;
    const formatted = formatPortEvent(event);
    retainPortEvent(this.recentPortEvents, formatted, PORT_EVENT_CAPACITY);
    if (event.event.port === 0x60 || event.event.port === 0x64)
      retainPortEvent(
        this.recentKeyboardControllerPortEvents,
        formatted,
        KEYBOARD_PORT_EVENT_CAPACITY
      );
    if (
      event.event.direction === "write" &&
      (event.event.port === 0x60 || event.event.port === 0x64)
    )
      retainPortEvent(
        this.recentKeyboardControllerWrites,
        formatted,
        KEYBOARD_COMMAND_WRITE_CAPACITY
      );
  }
}

function formatPortEvent(event: Extract<RebuiltMachineTraceEvent, { kind: "port" }>): string {
  const value = event.event.value
    .toString(16)
    .padStart(event.event.width / 4, "0")
    .toUpperCase();
  return `${event.event.direction === "read" ? "R" : "W"}${hex16(event.event.port)}:${value}`;
}

function retainPortEvent(events: string[], event: string, capacity: number): void {
  if (events.length === capacity) events.shift();
  events.push(event);
}

function hex8(value: number): string {
  return value.toString(16).padStart(2, "0").toUpperCase();
}

function readUint16(memory: PhysicalMemory, address: number): number {
  return memory.readUint8(address) | (memory.readUint8(address + 1) << 8);
}

function hex16(value: number): string {
  return (value & 0xffff).toString(16).padStart(4, "0").toUpperCase();
}

function bit(value: boolean): string {
  return value ? "1" : "0";
}
