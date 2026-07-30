import { EmulationClock, type EmulationTime } from "./emulation-clock.js";

export interface CycleSchedulerProfile {
  readonly cpuCyclesPerSecond: bigint;
  readonly pitTicksPerSecond: bigint;
}

export const deskPro386CycleProfile: CycleSchedulerProfile = {
  cpuCyclesPerSecond: 16_000_000n,
  pitTicksPerSecond: 1_193_182n
};

/** Converts explicit CPU cycles into deterministic device-clock ticks. */
export class CycleScheduler {
  private readonly clock = new EmulationClock();
  private pitRemainder = 0n;

  public constructor(private readonly profile: CycleSchedulerProfile) {
    if (profile.cpuCyclesPerSecond <= 0n || profile.pitTicksPerSecond <= 0n)
      throw new RangeError("Cycle scheduler frequencies must be positive");
  }

  public advance(cycles: number): { readonly time: EmulationTime; readonly pitTicks: number } {
    if (!Number.isSafeInteger(cycles) || cycles < 0)
      throw new RangeError("CPU cycle charge must be a non-negative safe integer");
    const charge = BigInt(cycles);
    const numerator = this.pitRemainder + charge * this.profile.pitTicksPerSecond;
    const ticks = numerator / this.profile.cpuCyclesPerSecond;
    this.pitRemainder = numerator % this.profile.cpuCyclesPerSecond;
    if (ticks > BigInt(Number.MAX_SAFE_INTEGER))
      throw new RangeError("PIT tick charge exceeds safe range");
    return { time: this.clock.advance(charge), pitTicks: Number(ticks) };
  }

  public reset(): void {
    this.clock.reset();
    this.pitRemainder = 0n;
  }

  public snapshot(): EmulationTime {
    return this.clock.snapshot();
  }
}
