export interface EmulationTime {
  readonly cycles: bigint;
}

export interface HostScheduler {
  requestRun(callback: () => void): () => void;
}

export class EmulationClock {
  private cycles = 0n;

  public advance(cycles: bigint): EmulationTime {
    if (cycles < 0n) throw new Error("Emulation cycles must not be negative");
    this.cycles += cycles;
    return this.snapshot();
  }

  public reset(): EmulationTime {
    this.cycles = 0n;
    return this.snapshot();
  }

  public snapshot(): EmulationTime {
    return { cycles: this.cycles };
  }

  public restore(time: EmulationTime): void {
    if (time.cycles < 0n) throw new Error("Emulation cycles must not be negative");
    this.cycles = time.cycles;
  }
}
