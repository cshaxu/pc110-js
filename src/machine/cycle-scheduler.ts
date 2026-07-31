import { EmulationClock, type EmulationTime } from "./emulation-clock.js";

export interface CycleSchedulerProfile {
  readonly cpuCyclesPerSecond: bigint;
  readonly pitTicksPerSecond: bigint;
  readonly rtcTicksPerSecond: bigint;
}

export interface CycleSchedulerSnapshot {
  readonly time: EmulationTime;
  readonly pitRemainder: bigint;
  readonly rtcRemainder: bigint;
  readonly fdcDmaRemainder: bigint;
}

export const deskPro386CycleProfile: CycleSchedulerProfile = {
  cpuCyclesPerSecond: 16_000_000n,
  pitTicksPerSecond: 1_193_181n,
  rtcTicksPerSecond: 32_768n
};

/** Converts explicit CPU cycles into deterministic device-clock ticks. */
export class CycleScheduler {
  private readonly clock = new EmulationClock();
  private readonly cpuCyclesPerSecond: number;
  private readonly pitTicksPerSecond: number;
  private readonly rtcTicksPerSecond: number;
  private pitRemainder = 0;
  private rtcRemainder = 0;
  private fdcDmaRemainder = 0;

  public constructor(private readonly profile: CycleSchedulerProfile) {
    if (
      profile.cpuCyclesPerSecond <= 0n ||
      profile.pitTicksPerSecond <= 0n ||
      profile.rtcTicksPerSecond <= 0n
    )
      throw new RangeError("Cycle scheduler frequencies must be positive");
    this.cpuCyclesPerSecond = safeFrequency(profile.cpuCyclesPerSecond, "CPU");
    this.pitTicksPerSecond = safeFrequency(profile.pitTicksPerSecond, "PIT");
    this.rtcTicksPerSecond = safeFrequency(profile.rtcTicksPerSecond, "RTC");
  }

  public advance(cycles: number): {
    readonly time: EmulationTime;
    readonly pitTicks: number;
    readonly rtcTicks: number;
  } {
    if (!Number.isSafeInteger(cycles) || cycles < 0)
      throw new RangeError("CPU cycle charge must be a non-negative safe integer");
    const pitNumerator = safeNumerator(this.pitRemainder, cycles, this.pitTicksPerSecond, "PIT");
    const pitTicks = Math.floor(pitNumerator / this.cpuCyclesPerSecond);
    this.pitRemainder = pitNumerator % this.cpuCyclesPerSecond;
    const rtcNumerator = safeNumerator(this.rtcRemainder, cycles, this.rtcTicksPerSecond, "RTC");
    const rtcTicks = Math.floor(rtcNumerator / this.cpuCyclesPerSecond);
    this.rtcRemainder = rtcNumerator % this.cpuCyclesPerSecond;
    return {
      time: this.clock.advance(cycles),
      pitTicks,
      rtcTicks
    };
  }

  public reset(): void {
    this.clock.reset();
    this.pitRemainder = 0;
    this.rtcRemainder = 0;
    this.fdcDmaRemainder = 0;
  }

  /** Converts elapsed CPU cycles into selected FDC DMA byte-service slots. */
  public advanceFdcDmaSlots(cycles: number, bytesPerSecond: number): number {
    if (!Number.isSafeInteger(cycles) || cycles < 0)
      throw new RangeError("CPU cycle charge must be a non-negative safe integer");
    if (!Number.isSafeInteger(bytesPerSecond) || bytesPerSecond < 0)
      throw new RangeError("FDC DMA byte rate must be a non-negative safe integer");
    const numerator = safeNumerator(this.fdcDmaRemainder, cycles, bytesPerSecond, "FDC DMA");
    const slots = Math.floor(numerator / this.cpuCyclesPerSecond);
    this.fdcDmaRemainder = numerator % this.cpuCyclesPerSecond;
    return slots;
  }

  public resetFdcDmaSlots(): void {
    this.fdcDmaRemainder = 0;
  }

  public snapshot(): EmulationTime {
    return this.clock.snapshot();
  }

  public capture(): CycleSchedulerSnapshot {
    return {
      time: this.clock.snapshot(),
      pitRemainder: BigInt(this.pitRemainder),
      rtcRemainder: BigInt(this.rtcRemainder),
      fdcDmaRemainder: BigInt(this.fdcDmaRemainder)
    };
  }

  public restore(snapshot: CycleSchedulerSnapshot): void {
    this.assertRemainder(snapshot.pitRemainder, "PIT");
    this.assertRemainder(snapshot.rtcRemainder, "RTC");
    this.assertRemainder(snapshot.fdcDmaRemainder, "FDC DMA");
    this.clock.restore(snapshot.time);
    this.pitRemainder = Number(snapshot.pitRemainder);
    this.rtcRemainder = Number(snapshot.rtcRemainder);
    this.fdcDmaRemainder = Number(snapshot.fdcDmaRemainder);
  }

  private assertRemainder(value: bigint, name: string): void {
    if (value < 0n || value >= this.profile.cpuCyclesPerSecond)
      throw new RangeError(`${name} remainder must be within one CPU-second divisor`);
  }
}

function safeFrequency(value: bigint, name: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError(`${name} frequency exceeds the safe integer range`);
  return Number(value);
}

function safeNumerator(remainder: number, cycles: number, rate: number, name: string): number {
  if (cycles > Math.floor((Number.MAX_SAFE_INTEGER - remainder) / rate))
    throw new RangeError(`${name} clock numerator exceeds the safe integer range`);
  return remainder + cycles * rate;
}
