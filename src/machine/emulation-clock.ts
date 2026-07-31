export interface EmulationTime {
  readonly cycles: bigint;
}

export interface HostScheduler {
  requestRun(callback: () => void): () => void;
}

export class EmulationClock {
  private cycles = 0;

  public advance(cycles: number | bigint): EmulationTime {
    const charge = safeCycleNumber(cycles);
    if (this.cycles > Number.MAX_SAFE_INTEGER - charge)
      throw new RangeError("Emulation cycle count exceeds the safe integer range");
    this.cycles += charge;
    return this.snapshot();
  }

  public reset(): EmulationTime {
    this.cycles = 0;
    return this.snapshot();
  }

  public snapshot(): EmulationTime {
    return { cycles: BigInt(this.cycles) };
  }

  public restore(time: EmulationTime): void {
    this.cycles = safeCycleNumber(time.cycles);
  }
}

function safeCycleNumber(value: number | bigint): number {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new RangeError("Emulation cycles must be non-negative safe integers");
    return value;
  }
  if (value < 0n) throw new Error("Emulation cycles must not be negative");
  if (value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("Emulation cycle count exceeds the safe integer range");
  return Number(value);
}
