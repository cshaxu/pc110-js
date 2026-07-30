import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { VgaDac } from "./vga-dac.js";
import { VgaInputStatus0 } from "./vga-input-status0.js";

describe("VGA Input Status 0", () => {
  it("derives color-monitor switch sense from DAC register zero", () => {
    const dac = new VgaDac();
    const status = new VgaInputStatus0(dac);
    const bus = new RebuiltMachinePortBus();
    for (const range of status.portRanges()) bus.register(range);

    expect(bus.read(0x3c2, 8)).toBe(0x10);
    dac.write(0x3c8, 0, 8);
    dac.write(0x3c9, 0x2d, 8);
    dac.write(0x3c9, 0x12, 8);
    dac.write(0x3c9, 0x12, 8);
    expect(bus.read(0x3c2, 8)).toBe(0);
    expect(() => bus.read(0x3c2, 16)).toThrow("8-bit");
  });
});
