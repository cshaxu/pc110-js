import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { VgaDac } from "./vga-dac.js";

describe("VGA DAC", () => {
  it("writes and reads 6-bit RGB palette triplets with address auto-increment", () => {
    const dac = new VgaDac();
    const bus = new RebuiltMachinePortBus();
    for (const range of dac.portRanges()) bus.register(range);
    bus.write(0x3c8, 0xfe, 8);
    for (const value of [0x7f, 2, 3, 4, 5, 6]) bus.write(0x3c9, value, 8);
    expect(dac.color(0xfe)).toEqual([0x3f, 2, 3]);
    expect(dac.color(0xff)).toEqual([4, 5, 6]);
    bus.write(0x3c7, 0xfe, 8);
    expect([bus.read(0x3c9, 8), bus.read(0x3c9, 8), bus.read(0x3c9, 8)]).toEqual([0x3f, 2, 3]);
    expect(bus.read(0x3c7, 8)).toBe(0x03);
  });
});
