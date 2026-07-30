import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { VgaMiscellaneousOutput } from "./vga-miscellaneous-output.js";

describe("VGA miscellaneous output", () => {
  it("retains its write-only/read-only port pair", () => {
    const output = new VgaMiscellaneousOutput();
    const bus = new RebuiltMachinePortBus();
    for (const range of output.portRanges()) bus.register(range);
    bus.write(0x3c2, 0xe3, 8);
    expect(bus.read(0x3cc, 8)).toBe(0xe3);
    expect(() => bus.read(0x3c2, 8)).toThrow("Unmapped");
    expect(() => bus.write(0x3cc, 0, 8)).toThrow("Unmapped");
  });
});
