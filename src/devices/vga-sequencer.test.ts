import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { VgaSequencer } from "./vga-sequencer.js";

describe("VGA sequencer", () => {
  it("retains each native register class with its defined bit width", () => {
    const sequencer = new VgaSequencer();
    const bus = new RebuiltMachinePortBus();
    for (const range of sequencer.portRanges()) bus.register(range);
    for (const index of [0, 1, 2, 3, 4]) {
      bus.write(0x3c4, index, 8);
      bus.write(0x3c5, 0xff, 8);
    }
    expect(sequencer.snapshot().data).toEqual([0x03, 0x3f, 0x0f, 0x3f, 0x0f]);
    expect(bus.read(0x3c4, 8)).toBe(4);
    expect(bus.read(0x3c5, 8)).toBe(0x0f);
  });

  it("rejects undefined indexed data and invalid port widths, then resets", () => {
    const sequencer = new VgaSequencer();
    sequencer.write(0x3c4, 7, 8);
    expect(() => sequencer.write(0x3c5, 0, 8)).toThrow("not defined");
    expect(() => sequencer.read(0x3c4, 16)).toThrow("8-bit");
    sequencer.reset();
    expect(sequencer.snapshot()).toEqual({ index: 0, data: [0, 0, 0, 0, 0] });
  });
});
