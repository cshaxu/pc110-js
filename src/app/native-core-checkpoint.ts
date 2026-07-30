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
      timer2Output: bit(this.core.pit.counter2Output())
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
