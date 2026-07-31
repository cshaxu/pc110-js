import { describe, expect, it } from "vitest";
import { CycleScheduler, deskPro386CycleProfile } from "./cycle-scheduler.js";

describe("CycleScheduler", () => {
  it("converts cycles to PIT ticks with an exact carried remainder", () => {
    const scheduler = new CycleScheduler({
      cpuCyclesPerSecond: 10n,
      pitTicksPerSecond: 3n,
      rtcTicksPerSecond: 4n
    });
    expect(scheduler.advance(3)).toEqual({ time: { cycles: 3n }, pitTicks: 0, rtcTicks: 1 });
    expect(scheduler.advance(1)).toEqual({ time: { cycles: 4n }, pitTicks: 1, rtcTicks: 0 });
    expect(scheduler.advance(6)).toEqual({ time: { cycles: 10n }, pitTicks: 2, rtcTicks: 3 });
  });

  it("uses the selected PCjs PIT integer clock at its 80386 boundary", () => {
    const scheduler = new CycleScheduler(deskPro386CycleProfile);
    expect(scheduler.advance(2_816).pitTicks).toBe(209);
    expect(scheduler.advance(1).pitTicks).toBe(1);
  });

  it("resets accumulated time and rejects invalid charges", () => {
    const scheduler = new CycleScheduler({
      cpuCyclesPerSecond: 2n,
      pitTicksPerSecond: 1n,
      rtcTicksPerSecond: 1n
    });
    scheduler.advance(1);
    scheduler.reset();
    expect(scheduler.snapshot()).toEqual({ cycles: 0n });
    expect(() => scheduler.advance(-1)).toThrow("non-negative");
    expect(
      () =>
        new CycleScheduler({ cpuCyclesPerSecond: 0n, pitTicksPerSecond: 1n, rtcTicksPerSecond: 1n })
    ).toThrow("positive");
    expect(
      () =>
        new CycleScheduler({ cpuCyclesPerSecond: 1n, pitTicksPerSecond: 1n, rtcTicksPerSecond: 0n })
    ).toThrow("positive");
  });

  it("converts CPU cycles to FDC DMA slots with an independent remainder", () => {
    const scheduler = new CycleScheduler({
      cpuCyclesPerSecond: 10n,
      pitTicksPerSecond: 3n,
      rtcTicksPerSecond: 4n
    });
    expect(scheduler.advanceFdcDmaSlots(3, 3)).toBe(0);
    expect(scheduler.advanceFdcDmaSlots(1, 3)).toBe(1);
    expect(scheduler.advanceFdcDmaSlots(6, 3)).toBe(2);
    scheduler.resetFdcDmaSlots();
    expect(scheduler.advanceFdcDmaSlots(3, 3)).toBe(0);
    expect(() => scheduler.advanceFdcDmaSlots(-1, 1)).toThrow("non-negative");
    expect(() => scheduler.advanceFdcDmaSlots(1, -1)).toThrow("non-negative");
  });

  it("round-trips virtual time and all carried device-clock remainders", () => {
    const scheduler = new CycleScheduler({
      cpuCyclesPerSecond: 10n,
      pitTicksPerSecond: 3n,
      rtcTicksPerSecond: 4n
    });
    scheduler.advance(3);
    scheduler.advanceFdcDmaSlots(3, 3);
    const captured = scheduler.capture();

    scheduler.advance(7);
    scheduler.advanceFdcDmaSlots(7, 3);
    scheduler.restore(captured);

    expect(scheduler.capture()).toEqual(captured);
    expect(scheduler.advance(1)).toEqual({ time: { cycles: 4n }, pitTicks: 1, rtcTicks: 0 });
    expect(scheduler.advanceFdcDmaSlots(1, 3)).toBe(1);
  });
});
