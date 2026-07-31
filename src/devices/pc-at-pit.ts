import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";
import {
  Pit8254,
  type Pit8254State,
  type PitAdvanceResult,
  type PitCounterSnapshot
} from "./pit8254.js";

export const PIT_COUNTER0_PORT = 0x40;
export const PIT_COUNTER1_PORT = 0x41;
export const PIT_COUNTER2_PORT = 0x42;
export const PIT_CONTROL_PORT = 0x43;

export interface PcAtPitPortRange {
  readonly start: number;
  readonly end: number;
  readonly read?: (port: number, width: PortWidth) => number;
  readonly write?: (port: number, value: number, width: PortWidth) => void;
}

export interface PcAtPitState {
  readonly timer: Pit8254State;
  readonly cycleRemainders: readonly bigint[];
}

export class PcAtPit {
  public readonly timer = new Pit8254();
  private readonly cycleRemainders = [0n, 0n, 0n];

  public constructor(private readonly raiseIrq?: (irq: number) => void) {}

  public reset(): void {
    this.timer.reset();
    this.cycleRemainders.fill(0n);
  }

  public read(port: number, width: PortWidth): number {
    this.requireByteWidth(width);
    if (port < PIT_COUNTER0_PORT || port > PIT_COUNTER2_PORT)
      throw new RangeError(`PC/AT PIT port is not readable: 0x${port.toString(16)}`);
    return this.timer.readCounter(port - PIT_COUNTER0_PORT);
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requireByteWidth(width);
    if (port >= PIT_COUNTER0_PORT && port <= PIT_COUNTER2_PORT) {
      const index = port - PIT_COUNTER0_PORT;
      if (this.timer.writeCounter(index, value)) {
        this.cycleRemainders[index] = 0n;
      }
      return;
    }
    if (port === PIT_CONTROL_PORT) return this.timer.writeControl(value);
    throw new RangeError(`PC/AT PIT port is not mapped: 0x${port.toString(16)}`);
  }

  public advance(ticks: number): PitAdvanceResult {
    const result = this.timer.advance(ticks);
    if (result.risingEdges.includes(0)) this.raiseIrq?.(0);
    return result;
  }

  /** Advances each counter from CPU cycles using its own reload-relative phase. */
  public advanceCycles(
    cycles: number,
    cpuCyclesPerSecond: bigint,
    pitTicksPerSecond: bigint
  ): void {
    if (!Number.isSafeInteger(cycles) || cycles < 0)
      throw new RangeError("PIT CPU cycles must be non-negative safe integers");
    for (let index = 0; index < 3; index += 1) {
      const numerator = this.cycleRemainders[index] + BigInt(cycles) * pitTicksPerSecond;
      const ticks = numerator / cpuCyclesPerSecond;
      this.cycleRemainders[index] = numerator % cpuCyclesPerSecond;
      if (ticks > BigInt(Number.MAX_SAFE_INTEGER))
        throw new RangeError("PIT tick charge exceeds safe range");
      const result = this.timer.advanceCounter(index, Number(ticks));
      if (index === 0 && result.risingEdges.length) this.raiseIrq?.(0);
    }
  }

  public counter2Output(): boolean {
    return this.timer.output(2);
  }

  public counter1Output(): boolean {
    return this.timer.output(1);
  }

  public snapshot(index: number): PitCounterSnapshot {
    return this.timer.snapshot(index);
  }

  public capture(): PcAtPitState {
    return {
      timer: this.timer.capture(),
      cycleRemainders: [...this.cycleRemainders]
    };
  }

  public restore(state: PcAtPitState): void {
    if (state.cycleRemainders.length !== 3)
      throw new RangeError("PC/AT PIT phase state must contain three counters");
    this.timer.restore(state.timer);
    state.cycleRemainders.forEach((remainder, index) => {
      if (remainder < 0n) throw new RangeError("PC/AT PIT cycle remainder must be non-negative");
      this.cycleRemainders[index] = remainder;
    });
  }

  public portRanges(): readonly PcAtPitPortRange[] {
    return [
      {
        start: PIT_COUNTER0_PORT,
        end: PIT_COUNTER2_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      },
      {
        start: PIT_CONTROL_PORT,
        end: PIT_CONTROL_PORT,
        write: (port, value, width) => this.write(port, value, width)
      }
    ];
  }

  private requireByteWidth(width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(`PC/AT PIT supports 8-bit I/O only, received ${width}-bit`);
  }
}
