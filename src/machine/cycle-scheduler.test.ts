import { describe, expect, it } from "vitest";
import { CycleScheduler } from "./cycle-scheduler.js";

describe("CycleScheduler", () => {
  it("converts cycles to PIT ticks with an exact carried remainder", () => {
    const scheduler = new CycleScheduler({ cpuCyclesPerSecond: 10n, pitTicksPerSecond: 3n });
    expect(scheduler.advance(3)).toEqual({ time: { cycles: 3n }, pitTicks: 0 });
    expect(scheduler.advance(1)).toEqual({ time: { cycles: 4n }, pitTicks: 1 });
    expect(scheduler.advance(6)).toEqual({ time: { cycles: 10n }, pitTicks: 2 });
  });

  it("resets accumulated time and rejects invalid charges", () => {
    const scheduler = new CycleScheduler({ cpuCyclesPerSecond: 2n, pitTicksPerSecond: 1n });
    scheduler.advance(1);
    scheduler.reset();
    expect(scheduler.snapshot()).toEqual({ cycles: 0n });
    expect(() => scheduler.advance(-1)).toThrow("non-negative");
    expect(() => new CycleScheduler({ cpuCyclesPerSecond: 0n, pitTicksPerSecond: 1n })).toThrow(
      "positive"
    );
  });
});
