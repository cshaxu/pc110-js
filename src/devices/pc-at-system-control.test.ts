import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { PcAtPit } from "./pc-at-pit.js";
import { PcAtSystemControl } from "./pc-at-system-control.js";

describe("project-native PC/AT system-port composition", () => {
  it("maps 0x61 and drives the counter-2 gate", () => {
    const pit = new PcAtPit();
    const control = new PcAtSystemControl(pit);
    const bus = new RebuiltMachinePortBus();
    for (const range of control.portRanges()) bus.register(range);
    bus.write(0x61, 0x03, 8);
    expect(control.snapshot()).toMatchObject({ timer2Gate: true, speakerData: true });
    expect(pit.snapshot(2).gate).toBe(true);
    expect(() => bus.read(0x61, 16)).toThrow("8-bit");
  });

  it("exposes counter-2 output and speaker signal without browser audio", () => {
    const pit = new PcAtPit();
    const control = new PcAtSystemControl(pit);
    pit.timer.writeControl(0xb0);
    pit.timer.writeCounter(2, 1);
    pit.timer.writeCounter(2, 0);
    control.write(0x61, 0x03, 8);
    pit.advance(1);
    expect(control.read(0x61, 8) & 0x20).toBe(0x20);
    expect(control.speakerOutput()).toBe(true);
    control.reset();
    expect(control.speakerOutput()).toBe(false);
  });
});
