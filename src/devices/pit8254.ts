export type PitAccessMode = 1 | 2 | 3;

export interface PitCounterSnapshot {
  readonly reload: number;
  readonly count: number;
  readonly output: boolean;
  readonly gate: boolean;
  readonly mode: number;
  readonly access: PitAccessMode;
  readonly nullCount: boolean;
}

export interface PitCounterState extends PitCounterSnapshot {
  readonly writeLow: number | undefined;
  readonly readLow: boolean;
  readonly latchedCount: number | undefined;
  readonly latchedStatus: number | undefined;
  readonly counting: boolean;
  readonly lowPulse: boolean;
  readonly phaseRemaining: number;
}

export interface Pit8254State {
  readonly counters: readonly PitCounterState[];
}

export interface PitAdvanceResult {
  readonly risingEdges: readonly number[];
}

export class Pit8254 {
  private readonly counters = [new PitCounter(), new PitCounter(), new PitCounter()];

  public reset(): void {
    for (const counter of this.counters) counter.reset();
  }

  public writeControl(value: number): void {
    const command = byte(value);
    const selection = command >>> 6;
    if (selection === 3) return this.writeReadBack(command);
    this.counter(selection).writeControl(command);
  }

  public writeCounter(index: number, value: number): boolean {
    return this.counter(index).writeData(value);
  }

  public readCounter(index: number): number {
    return this.counter(index).readData();
  }

  public setGate(index: number, level: boolean): void {
    this.counter(index).setGate(level);
  }

  public output(index: number): boolean {
    return this.counter(index).snapshot().output;
  }

  public snapshot(index: number): PitCounterSnapshot {
    return this.counter(index).snapshot();
  }

  public capture(): Pit8254State {
    return { counters: this.counters.map((counter) => counter.capture()) };
  }

  public restore(state: Pit8254State): void {
    if (state.counters.length !== this.counters.length)
      throw new RangeError("PIT checkpoint counter count is invalid");
    state.counters.forEach((counter, index) => this.counter(index).restore(counter));
  }

  public advance(ticks: number): PitAdvanceResult {
    if (!Number.isInteger(ticks) || ticks < 0)
      throw new RangeError("PIT ticks must be non-negative integers");
    const risingEdges: number[] = [];
    for (let tick = 0; tick < ticks; tick += 1) {
      this.counters.forEach((counter, index) => {
        if (counter.advanceOne()) risingEdges.push(index);
      });
    }
    return { risingEdges };
  }

  public advanceCounter(index: number, ticks: number): PitAdvanceResult {
    if (!Number.isInteger(ticks) || ticks < 0)
      throw new RangeError("PIT ticks must be non-negative integers");
    const counter = this.counter(index);
    const risingEdges: number[] = [];
    for (let tick = 0; tick < ticks; tick += 1) {
      if (counter.advanceOne()) risingEdges.push(index);
    }
    return { risingEdges };
  }

  public advanceCounterHasRisingEdge(index: number, ticks: number): boolean {
    if (!Number.isInteger(ticks) || ticks < 0)
      throw new RangeError("PIT ticks must be non-negative integers");
    const counter = this.counter(index);
    let risingEdge = false;
    for (let tick = 0; tick < ticks; tick += 1) {
      if (counter.advanceOne()) risingEdge = true;
    }
    return risingEdge;
  }

  private writeReadBack(command: number): void {
    for (let index = 0; index < 3; index += 1) {
      if (command & (1 << (index + 1))) continue;
      const counter = this.counter(index);
      if (!(command & 0x20)) counter.latchCount();
      if (!(command & 0x10)) counter.latchStatus();
    }
  }

  private counter(index: number): PitCounter {
    if (!Number.isInteger(index) || index < 0 || index > 2)
      throw new RangeError(`PIT counter is outside 0-2: ${index}`);
    return this.counters[index]!;
  }
}

class PitCounter {
  private reload = 0;
  private count = 0;
  private output = false;
  private gate = true;
  private mode = 0;
  private access: PitAccessMode = 3;
  private nullCount = true;
  private writeLow?: number;
  private readLow = true;
  private latchedCount?: number;
  private latchedStatus?: number;
  private counting = false;
  private lowPulse = false;
  private phaseRemaining = 0;

  public reset(): void {
    this.reload = 0;
    this.count = 0;
    this.output = false;
    this.gate = true;
    this.mode = 0;
    this.access = 3;
    this.nullCount = true;
    this.writeLow = undefined;
    this.readLow = true;
    this.latchedCount = undefined;
    this.latchedStatus = undefined;
    this.counting = false;
    this.lowPulse = false;
    this.phaseRemaining = 0;
  }

  public writeControl(command: number): void {
    const access = (command >>> 4) & 3;
    if (access === 0) return this.latchCount();
    if (command & 1)
      throw new RangeError("BCD PIT counting is outside the current binary-counter scope");
    const rawMode = (command >>> 1) & 7;
    this.mode = rawMode === 6 ? 2 : rawMode === 7 ? 3 : rawMode;
    this.access = access as PitAccessMode;
    this.writeLow = undefined;
    this.readLow = true;
    this.latchedCount = undefined;
    this.latchedStatus = undefined;
    this.nullCount = true;
  }

  public writeData(value: number): boolean {
    const data = byte(value);
    if (this.access === 1) {
      this.load(data);
      return true;
    }
    if (this.access === 2) {
      this.load(data << 8);
      return true;
    }
    if (this.writeLow === undefined) {
      this.writeLow = data;
      return false;
    }
    this.load(this.writeLow | (data << 8));
    this.writeLow = undefined;
    return true;
  }

  public readData(): number {
    if (this.latchedStatus !== undefined) {
      const result = this.latchedStatus;
      this.latchedStatus = undefined;
      return result;
    }
    const count = this.latchedCount ?? this.count;
    const result = this.readByte(count);
    if (this.access !== 3 || !this.readLow) this.latchedCount = undefined;
    return result;
  }

  public latchCount(): void {
    if (this.latchedCount === undefined) this.latchedCount = this.count;
  }

  public latchStatus(): void {
    if (this.latchedStatus === undefined) this.latchedStatus = this.status();
  }

  public setGate(level: boolean): void {
    const rising = !this.gate && level;
    this.gate = level;
    if (this.mode === 2 || this.mode === 3) {
      if (!level) {
        this.output = true;
        this.counting = false;
      } else if (rising && !this.nullCount) this.startPeriodic();
      return;
    }
    if ((this.mode === 1 || this.mode === 5) && rising && !this.nullCount) this.startTriggered();
  }

  public advanceOne(): boolean {
    const wasOutput = this.output;
    if (!this.counting || !this.gate) return false;
    if (this.mode === 0 || this.mode === 1) {
      if (this.count > 1) this.count -= 1;
      else {
        this.count = 0;
        this.output = true;
        this.counting = false;
      }
    } else if (this.mode === 2) {
      if (this.lowPulse) {
        this.lowPulse = false;
        this.output = true;
        this.count = this.reload;
      } else if (this.count > 2) this.count -= 1;
      else if (this.count === 2) {
        this.count = 1;
        this.output = false;
        this.lowPulse = true;
      } else {
        this.count = 1;
        this.output = false;
        this.lowPulse = true;
      }
    } else if (this.mode === 3) {
      // Mode 3 decrements the visible count by two per input clock. An odd
      // terminal count carries one count into the following half-period.
      this.count = this.count > 2 ? this.count - 2 : this.reload - (2 - this.count);
      this.phaseRemaining -= 1;
      if (this.phaseRemaining === 0) {
        this.output = !this.output;
        this.phaseRemaining = this.output
          ? Math.ceil(this.reload / 2)
          : Math.floor(this.reload / 2);
      }
    } else {
      if (this.lowPulse) {
        this.lowPulse = false;
        this.output = true;
        this.counting = false;
      } else if (this.count > 1) this.count -= 1;
      else {
        this.count = 0;
        this.output = false;
        this.lowPulse = true;
      }
    }
    return !wasOutput && this.output;
  }

  public snapshot(): PitCounterSnapshot {
    return {
      reload: this.reload,
      count: this.count,
      output: this.output,
      gate: this.gate,
      mode: this.mode,
      access: this.access,
      nullCount: this.nullCount
    };
  }

  public capture(): PitCounterState {
    return {
      ...this.snapshot(),
      writeLow: this.writeLow,
      readLow: this.readLow,
      latchedCount: this.latchedCount,
      latchedStatus: this.latchedStatus,
      counting: this.counting,
      lowPulse: this.lowPulse,
      phaseRemaining: this.phaseRemaining
    };
  }

  public restore(state: PitCounterState): void {
    this.reload = state.reload;
    this.count = state.count;
    this.output = state.output;
    this.gate = state.gate;
    this.mode = state.mode;
    this.access = state.access;
    this.nullCount = state.nullCount;
    this.writeLow = state.writeLow;
    this.readLow = state.readLow;
    this.latchedCount = state.latchedCount;
    this.latchedStatus = state.latchedStatus;
    this.counting = state.counting;
    this.lowPulse = state.lowPulse;
    this.phaseRemaining = state.phaseRemaining;
  }

  private load(rawCount: number): void {
    this.reload = rawCount === 0 ? 0x10000 : rawCount;
    this.count = this.reload;
    this.nullCount = false;
    this.lowPulse = false;
    this.phaseRemaining = 0;
    if (this.mode === 0) {
      this.output = false;
      this.counting = this.gate;
    } else if (this.mode === 1 || this.mode === 5) {
      this.output = true;
      this.counting = false;
    } else if (this.mode === 2 || this.mode === 3) {
      if (this.gate) this.startPeriodic();
      else {
        this.output = true;
        this.counting = false;
      }
    } else {
      this.output = true;
      this.counting = this.gate;
    }
  }

  private startPeriodic(): void {
    this.count = this.reload;
    this.output = true;
    this.counting = true;
    this.lowPulse = false;
    this.phaseRemaining = this.mode === 3 ? Math.ceil(this.reload / 2) : 0;
  }

  private startTriggered(): void {
    this.count = this.reload;
    this.output = false;
    this.counting = true;
    this.lowPulse = false;
  }

  private readByte(count: number): number {
    const value = count === 0x10000 ? 0 : count;
    if (this.access === 1) return value & 0xff;
    if (this.access === 2) return value >>> 8;
    const result = this.readLow ? value & 0xff : value >>> 8;
    this.readLow = !this.readLow;
    return result;
  }

  private status(): number {
    return (
      (this.output ? 0x80 : 0) | (this.nullCount ? 0x40 : 0) | (this.access << 4) | (this.mode << 1)
    );
  }
}

function byte(value: number): number {
  if (!Number.isInteger(value)) throw new RangeError(`PIT byte is not an integer: ${value}`);
  return value & 0xff;
}
