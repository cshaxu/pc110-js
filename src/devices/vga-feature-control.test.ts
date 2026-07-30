import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { VgaFeatureControl } from "./vga-feature-control.js";

describe("VGA Feature Control", () => {
  it("retains only the defined bits through monochrome and color write aliases", () => {
    const feature = new VgaFeatureControl();
    const bus = new RebuiltMachinePortBus();
    for (const range of feature.portRanges()) bus.register(range);

    bus.write(0x3ba, 0xff, 8);
    expect(bus.read(0x3ca, 8)).toBe(0x03);
    bus.write(0x3da, 0x02, 8);
    expect(bus.read(0x3ca, 8)).toBe(0x02);
    expect(() => bus.write(0x3ca, 0, 8)).toThrow("Unmapped");
    feature.reset();
    expect(bus.read(0x3ca, 8)).toBe(0);
  });
});
