import { PhysicalMemory } from "../memory/physical-memory.js";
import { RebuiltPcAt386Core } from "../machine/rebuilt-pc-at-386-core.js";
import { VgaTextFramebuffer } from "../devices/vga-text-framebuffer.js";
import { createRomImage } from "../firmware/rom-image.js";
import { FLOPPY_1440K_GEOMETRY, FloppyDrive } from "../devices/floppy-drive.js";

export interface NativeCoreCheckpointSnapshot {
  readonly codeAddress: string;
  readonly masterRequest: string;
  readonly masterInService: string;
  readonly slaveRequest: string;
  readonly slaveInService: string;
  readonly timer0Output: string;
  readonly timer2Output: string;
  readonly dma0Masks: string;
  readonly dma1Masks: string;
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
}

export class NativeCoreCheckpoint {
  public readonly memory = new PhysicalMemory({
    ramBytes: 0xa0000,
    a20Enabled: true,
    unmappedReadValue: 0xff,
    ignoreUnmappedWrites: true
  });
  public readonly core = new RebuiltPcAt386Core(this.memory, undefined, {
    unpopulatedIo: "floating"
  });
  public readonly textFramebuffer = new VgaTextFramebuffer(
    this.core.vgaMemory,
    this.core.crtc,
    this.core.dac
  );

  public reset(): void {
    this.core.reset();
  }

  public mapSystemRom(bytes: Uint8Array): void {
    this.memory.mapRom(
      createRomImage("system-rom", bytes),
      0xffff8000,
      [0xf8000, 0xf0000, 0xffff0000]
    );
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
    return {
      codeAddress: `${hex16(cpu.segments.cs.selector)}:${hex16(cpu.eip)}`,
      masterRequest: hex8(pic.master.request),
      masterInService: hex8(pic.master.inService),
      slaveRequest: hex8(pic.slave.request),
      slaveInService: hex8(pic.slave.inService),
      timer0Output: bit(this.core.pit.snapshot(0).output),
      timer2Output: bit(this.core.pit.counter2Output()),
      dma0Masks: hex8(this.core.dma.maskBits(0)),
      dma1Masks: hex8(this.core.dma.maskBits(1)),
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
      keyboardControllerKeyboardEnabled: bit(keyboardController.keyboardEnabled)
    };
  }
}

function hex8(value: number): string {
  return value.toString(16).padStart(2, "0").toUpperCase();
}

function hex16(value: number): string {
  return (value & 0xffff).toString(16).padStart(4, "0").toUpperCase();
}

function bit(value: boolean): string {
  return value ? "1" : "0";
}
