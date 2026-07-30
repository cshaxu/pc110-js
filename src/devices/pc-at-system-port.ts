export const PC_AT_SYSTEM_PORT = 0x61;

const TIMER2_GATE = 0x01;
const SPEAKER_DATA = 0x02;
const DISABLE_MEMORY_PARITY = 0x10;
const DISABLE_IO_CHECK = 0x20;
const REFRESH_STATUS = 0x10;

export interface PcAtSystemPortSnapshot {
  readonly control: number;
  readonly refreshActive: boolean;
  readonly timer2Gate: boolean;
  readonly speakerData: boolean;
  readonly memoryParityEnabled: boolean;
  readonly ioCheckEnabled: boolean;
}

/**
 * Project-native generic PC/AT port 0x61 state. Keyboard-controller and
 * DeskPro-specific error lines are intentionally owned by later variants.
 */
export class PcAtSystemPort {
  private control = 0;
  private refreshActive = true;

  public reset(): void {
    this.control = 0;
    this.refreshActive = true;
  }

  public read(): number {
    return (this.control & ~REFRESH_STATUS) | (this.refreshActive ? 0 : REFRESH_STATUS);
  }

  public write(value: number): void {
    if (!Number.isInteger(value))
      throw new RangeError(`PC/AT system-port byte is not an integer: ${value}`);
    this.control = value & 0xff;
  }

  public setRefreshActive(active: boolean): void {
    this.refreshActive = active;
  }

  public timer2Gate(): boolean {
    return Boolean(this.control & TIMER2_GATE);
  }

  public speakerData(): boolean {
    return Boolean(this.control & SPEAKER_DATA);
  }

  public speakerOutput(timer2Output: boolean): boolean {
    return this.timer2Gate() && this.speakerData() && timer2Output;
  }

  public memoryParityEnabled(): boolean {
    return !(this.control & DISABLE_MEMORY_PARITY);
  }

  public ioCheckEnabled(): boolean {
    return !(this.control & DISABLE_IO_CHECK);
  }

  public snapshot(): PcAtSystemPortSnapshot {
    return {
      control: this.control,
      refreshActive: this.refreshActive,
      timer2Gate: this.timer2Gate(),
      speakerData: this.speakerData(),
      memoryParityEnabled: this.memoryParityEnabled(),
      ioCheckEnabled: this.ioCheckEnabled()
    };
  }
}
