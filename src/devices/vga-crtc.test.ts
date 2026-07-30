import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { VgaCrtc } from "./vga-crtc.js";

describe("VGA CRTC", () => {
  it("retains indexed register state and derives display and cursor addresses", () => {
    const crtc = new VgaCrtc();
    const bus = new RebuiltMachinePortBus();
    for (const range of crtc.portRanges()) bus.register(range);
    for (const [index, value] of [
      [0x0c, 0x12],
      [0x0d, 0x34],
      [0x0e, 0x56],
      [0x0f, 0x78]
    ]) {
      bus.write(0x3d4, index, 8);
      bus.write(0x3d5, value, 8);
    }
    expect(crtc.displayStartAddress()).toBe(0x1234);
    expect(crtc.cursorAddress()).toBe(0x5678);
    expect(bus.read(0x3d4, 8)).toBe(0x0f);
    expect(bus.read(0x3d5, 8)).toBe(0x78);
  });

  it("transacts indexed register pairs through a little-endian word access", () => {
    const crtc = new VgaCrtc();
    const bus = new RebuiltMachinePortBus();
    for (const range of crtc.portRanges()) bus.register(range);

    bus.write(0x3d4, 0x340d, 16);
    expect(crtc.displayStartAddress()).toBe(0x0034);
    expect(bus.read(0x3d4, 16)).toBe(0x340d);
  });

  it("masks defined values and rejects unsupported accesses", () => {
    const crtc = new VgaCrtc();
    crtc.write(0x3d4, 3, 8);
    crtc.write(0x3d5, 0xff, 8);
    expect(crtc.readRegister(3)).toBe(0x1f);
    crtc.write(0x3d4, 0x1f, 8);
    expect(() => crtc.write(0x3d5, 0, 8)).toThrow("not defined");
    expect(() => crtc.read(0x3d4, 32)).toThrow("8-bit");
  });
});
