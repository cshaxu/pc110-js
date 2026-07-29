export type MachineRunState = "stopped" | "running" | "paused";

export interface MachineSnapshot {
  readonly profileId: string;
  readonly runState: MachineRunState;
  readonly resetCount: number;
}

export type MachineListener = (snapshot: MachineSnapshot) => void;

export class MachineRuntime {
  private readonly listeners = new Set<MachineListener>();
  private runState: MachineRunState = "stopped";
  private resetCount = 0;

  public constructor(private readonly profileId: string) {}

  public start(): void {
    if (this.runState === "running") return;
    this.runState = "running";
    this.emit();
  }

  public pause(): void {
    if (this.runState !== "running") return;
    this.runState = "paused";
    this.emit();
  }

  public reset(): void {
    this.runState = "stopped";
    this.resetCount += 1;
    this.emit();
  }

  public snapshot(): MachineSnapshot {
    return {
      profileId: this.profileId,
      runState: this.runState,
      resetCount: this.resetCount
    };
  }

  public subscribe(listener: MachineListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
