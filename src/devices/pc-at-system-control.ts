import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";
import { PcAtPit } from "./pc-at-pit.js";
import {
  PC_AT_SYSTEM_PORT,
  PcAtSystemPort,
  type PcAtSystemPortSnapshot
} from "./pc-at-system-port.js";

const TIMER2_OUTPUT = 0x20;
const REFRESH_OUTPUT = 0x10;

export interface PcAtSystemPortRange {
  readonly start: number;
  readonly end: number;
  readonly read: (port: number, width: PortWidth) => number;
  readonly write: (port: number, value: number, width: PortWidth) => void;
}

/**
 * Binds generic PC/AT port 0x61 state to PIT counter 2. Browser audio and
 * 8042-specific control bits remain outside this device.
 */
export class PcAtSystemControl {
  public readonly state = new PcAtSystemPort();

  public constructor(private readonly pit: PcAtPit) {}

  public reset(): void {
    this.state.reset();
    this.pit.timer.setGate(2, false);
  }

  public read(port: number, width: PortWidth): number {
    this.requirePort(port, width);
    return (
      this.state.read() |
      (this.pit.counter1Output() ? REFRESH_OUTPUT : 0) |
      (this.pit.counter2Output() ? TIMER2_OUTPUT : 0)
    );
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requirePort(port, width);
    this.state.write(value);
    this.pit.timer.setGate(2, this.state.timer2Gate());
  }

  public speakerOutput(): boolean {
    return this.state.speakerOutput(this.pit.counter2Output());
  }

  public snapshot(): PcAtSystemPortSnapshot {
    return this.state.snapshot();
  }

  public portRanges(): readonly PcAtSystemPortRange[] {
    return [
      {
        start: PC_AT_SYSTEM_PORT,
        end: PC_AT_SYSTEM_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      }
    ];
  }

  private requirePort(port: number, width: PortWidth): void {
    if (port !== PC_AT_SYSTEM_PORT)
      throw new RangeError(`PC/AT system port is not mapped: 0x${port.toString(16)}`);
    if (width !== 8)
      throw new RangeError(`PC/AT system port supports 8-bit I/O only, received ${width}-bit`);
  }
}
