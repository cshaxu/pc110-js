import { describe, expect, it } from "vitest";
import { EmulationClock } from "./emulation-clock.js";

describe("EmulationClock", () => {
  it("advances only through explicit emulated cycles", () => {
    const clock = new EmulationClock();
    expect(clock.advance(4n)).toEqual({ cycles: 4n });
    expect(clock.advance(9n)).toEqual({ cycles: 13n });
    expect(clock.reset()).toEqual({ cycles: 0n });
  });

  it("rejects negative cycle movement", () => {
    expect(() => new EmulationClock().advance(-1n)).toThrow("must not be negative");
  });
});
