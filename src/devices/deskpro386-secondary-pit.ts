import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";
import {
  Pit8254,
  type Pit8254State,
  type PitAdvanceResult,
  type PitCounterSnapshot
} from "./pit8254.js";

export const DESKPRO386_SECONDARY_PIT_COUNTER0_PORT = 0x48;
export const DESKPRO386_SECONDARY_PIT_COUNTER1_PORT = 0x49;
export const DESKPRO386_SECONDARY_PIT_COUNTER2_PORT = 0x4a;
export const DESKPRO386_SECONDARY_PIT_CONTROL_PORT = 0x4b;

export interface DeskPro386SecondaryPitPortRange {
  readonly start: number;
  readonly end: number;
  readonly read: (port: number, width: PortWidth) => number;
  readonly write: (port: number, value: number, width: PortWidth) => void;
}

export interface DeskPro386SecondaryPitState {
  readonly timer: Pit8254State;
  readonly control: number;
}

/**
 * The DeskPro 386's selected second 8254: counters 3-5 at ports 0x48-0x4B.
 * Its machine-specific output wiring remains explicit outside this port model.
 */
export class DeskPro386SecondaryPit {
  public readonly timer = new Pit8254();
  private control = 0;

  public reset(): void {
    this.timer.reset();
    this.control = 0;
  }

  public read(port: number, width: PortWidth): number {
    this.requireByteWidth(width);
    if (
      port >= DESKPRO386_SECONDARY_PIT_COUNTER0_PORT &&
      port <= DESKPRO386_SECONDARY_PIT_COUNTER2_PORT
    )
      return this.timer.readCounter(port - DESKPRO386_SECONDARY_PIT_COUNTER0_PORT);
    if (port === DESKPRO386_SECONDARY_PIT_CONTROL_PORT) return this.control;
    throw new RangeError(`DeskPro 386 secondary PIT port is not mapped: 0x${port.toString(16)}`);
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requireByteWidth(width);
    if (
      port >= DESKPRO386_SECONDARY_PIT_COUNTER0_PORT &&
      port <= DESKPRO386_SECONDARY_PIT_COUNTER2_PORT
    ) {
      this.timer.writeCounter(port - DESKPRO386_SECONDARY_PIT_COUNTER0_PORT, value);
      return;
    }
    if (port === DESKPRO386_SECONDARY_PIT_CONTROL_PORT) {
      this.control = value & 0xff;
      this.timer.writeControl(value);
      return;
    }
    throw new RangeError(`DeskPro 386 secondary PIT port is not mapped: 0x${port.toString(16)}`);
  }

  public advance(ticks: number): PitAdvanceResult {
    return this.timer.advance(ticks);
  }

  public snapshot(index: number): PitCounterSnapshot {
    return this.timer.snapshot(index);
  }

  public capture(): DeskPro386SecondaryPitState {
    return { timer: this.timer.capture(), control: this.control };
  }

  public restore(state: DeskPro386SecondaryPitState): void {
    if (!Number.isInteger(state.control))
      throw new RangeError("DeskPro 386 secondary PIT checkpoint control is invalid");
    this.timer.restore(state.timer);
    this.control = state.control & 0xff;
  }

  public portRanges(): readonly DeskPro386SecondaryPitPortRange[] {
    return [
      {
        start: DESKPRO386_SECONDARY_PIT_COUNTER0_PORT,
        end: DESKPRO386_SECONDARY_PIT_COUNTER2_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      },
      {
        start: DESKPRO386_SECONDARY_PIT_CONTROL_PORT,
        end: DESKPRO386_SECONDARY_PIT_CONTROL_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      }
    ];
  }

  private requireByteWidth(width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(
        `DeskPro 386 secondary PIT supports 8-bit I/O only, received ${width}-bit`
      );
  }
}
