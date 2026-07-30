import { PhysicalMemory } from "../memory/physical-memory.js";
import { RebuiltPcAt386Core } from "../machine/rebuilt-pc-at-386-core.js";

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
}

export class NativeCoreCheckpoint {
  public readonly core = new RebuiltPcAt386Core(
    new PhysicalMemory({ ramBytes: 0xa0000, a20Enabled: true })
  );

  public reset(): void {
    this.core.reset();
  }

  public snapshot(): NativeCoreCheckpointSnapshot {
    const cpu = this.core.runner.state.snapshot();
    const pic = this.core.pic.snapshot();
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
      a20Enabled: bit(this.core.keyboardOutputPort.snapshot().a20Enabled)
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
