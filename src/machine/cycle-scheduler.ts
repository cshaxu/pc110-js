import { EmulationClock, type EmulationTime } from "./emulation-clock.js";

export interface CycleSchedulerProfile {
  readonly cpuCyclesPerSecond: bigint;
  readonly pitTicksPerSecond: bigint;
  readonly rtcTicksPerSecond: bigint;
}

export const deskPro386CycleProfile: CycleSchedulerProfile = {
  cpuCyclesPerSecond: 16_000_000n,
  pitTicksPerSecond: 1_193_182n,
  rtcTicksPerSecond: 32_768n
};

/** Converts explicit CPU cycles into deterministic device-clock ticks. */
export class CycleScheduler {
  private readonly clock = new EmulationClock();
  private pitRemainder = 0n;
  private rtcRemainder = 0n;
  private fdcDmaRemainder = 0n;

  public constructor(private readonly profile: CycleSchedulerProfile) {
    if (
      profile.cpuCyclesPerSecond <= 0n ||
      profile.pitTicksPerSecond <= 0n ||
      profile.rtcTicksPerSecond <= 0n
    )
      throw new RangeError("Cycle scheduler frequencies must be positive");
  }

  public advance(cycles: number): {
    readonly time: EmulationTime;
    readonly pitTicks: number;
    readonly rtcTicks: number;
  } {
    if (!Number.isSafeInteger(cycles) || cycles < 0)
      throw new RangeError("CPU cycle charge must be a non-negative safe integer");
    const charge = BigInt(cycles);
    const numerator = this.pitRemainder + charge * this.profile.pitTicksPerSecond;
    const pitTicks = numerator / this.profile.cpuCyclesPerSecond;
    this.pitRemainder = numerator % this.profile.cpuCyclesPerSecond;
    const rtcNumerator = this.rtcRemainder + charge * this.profile.rtcTicksPerSecond;
    const rtcTicks = rtcNumerator / this.profile.cpuCyclesPerSecond;
    this.rtcRemainder = rtcNumerator % this.profile.cpuCyclesPerSecond;
    if (pitTicks > BigInt(Number.MAX_SAFE_INTEGER) || rtcTicks > BigInt(Number.MAX_SAFE_INTEGER))
      throw new RangeError("Device tick charge exceeds safe range");
    return {
      time: this.clock.advance(charge),
      pitTicks: Number(pitTicks),
      rtcTicks: Number(rtcTicks)
    };
  }

  public reset(): void {
    this.clock.reset();
    this.pitRemainder = 0n;
    this.rtcRemainder = 0n;
    this.fdcDmaRemainder = 0n;
  }

  /** Converts elapsed CPU cycles into selected FDC DMA byte-service slots. */
  public advanceFdcDmaSlots(cycles: number, bytesPerSecond: number): number {
    if (!Number.isSafeInteger(cycles) || cycles < 0)
      throw new RangeError("CPU cycle charge must be a non-negative safe integer");
    if (!Number.isSafeInteger(bytesPerSecond) || bytesPerSecond < 0)
      throw new RangeError("FDC DMA byte rate must be a non-negative safe integer");
    const numerator = this.fdcDmaRemainder + BigInt(cycles) * BigInt(bytesPerSecond);
    const slots = numerator / this.profile.cpuCyclesPerSecond;
    this.fdcDmaRemainder = numerator % this.profile.cpuCyclesPerSecond;
    if (slots > BigInt(Number.MAX_SAFE_INTEGER))
      throw new RangeError("FDC DMA slot charge exceeds safe range");
    return Number(slots);
  }

  public resetFdcDmaSlots(): void {
    this.fdcDmaRemainder = 0n;
  }

  public snapshot(): EmulationTime {
    return this.clock.snapshot();
  }
}
