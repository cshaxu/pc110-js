import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { PcAtPit, PIT_CONTROL_PORT, PIT_COUNTER0_PORT, PIT_COUNTER2_PORT } from "./pc-at-pit.js";

describe("project-native PC/AT PIT", () => {
  it("exports 8-bit counter and control ports through the rebuilt port bus", () => {
    const pit = new PcAtPit();
    const bus = new RebuiltMachinePortBus();
    for (const range of pit.portRanges()) bus.register(range);
    bus.write(PIT_CONTROL_PORT, 0x34, 8);
    bus.write(PIT_COUNTER0_PORT, 3, 8);
    bus.write(PIT_COUNTER0_PORT, 0, 8);
    expect(pit.advance(4).risingEdges).toEqual([0]);
    expect(() => bus.write(PIT_COUNTER0_PORT, 0, 16)).toThrow("8-bit");
  });

  it("raises IRQ0 from counter 0 but exposes counter 2 as a speaker-clock signal", () => {
    const irqs: number[] = [];
    const pit = new PcAtPit((irq) => irqs.push(irq));
    pit.write(PIT_CONTROL_PORT, 0x34, 8);
    pit.write(PIT_COUNTER0_PORT, 2, 8);
    pit.write(PIT_COUNTER0_PORT, 0, 8);
    pit.write(PIT_CONTROL_PORT, 0xb6, 8);
    pit.write(PIT_COUNTER2_PORT, 2, 8);
    pit.write(PIT_COUNTER2_PORT, 0, 8);
    pit.advance(2);
    expect(irqs).toEqual([]);
    pit.advance(1);
    expect(irqs).toEqual([0]);
    expect(pit.counter2Output()).toBe(false);
  });

  it("starts a loaded counter on the following CPU instruction and restores its phase", () => {
    const pit = new PcAtPit();
    pit.write(PIT_CONTROL_PORT, 0x54, 8);
    pit.write(PIT_COUNTER0_PORT + 1, 0x12, 8);

    pit.advanceCycles(12, 16n, 1n);
    expect(pit.snapshot(1).count).toBe(0x12);
    const checkpoint = pit.capture();

    pit.advanceCycles(16, 16n, 1n);
    expect(pit.snapshot(1).count).toBe(0x11);
    pit.restore(checkpoint);
    pit.advanceCycles(16, 16n, 1n);
    expect(pit.snapshot(1).count).toBe(0x11);
  });
});
