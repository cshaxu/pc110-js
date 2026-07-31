import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { MdaCompatibility } from "./mda-compatibility.js";

describe("VGA MDA compatibility ports", () => {
  it("retains the complete mirrored CRTC index/data family and mode state", () => {
    const mda = new MdaCompatibility();
    const bus = new RebuiltMachinePortBus();
    for (const range of mda.portRanges()) bus.register(range);
    bus.write(0x3b0, 0x2e, 8);
    bus.write(0x3b1, 0x5a, 8);
    expect(bus.read(0x3b6, 8)).toBe(0x0e);
    expect(bus.read(0x3b7, 8)).toBe(0x5a);
    bus.write(0x3b8, 0x29, 8);
    expect(bus.read(0x3b8, 8)).toBe(0x29);
    expect(mda.snapshot()).toMatchObject({ crtcIndex: 0x0e, mode: 0x29 });
  });

  it("transacts every mirrored CRTC index/data pair through a little-endian word", () => {
    const mda = new MdaCompatibility();
    const bus = new RebuiltMachinePortBus();
    for (const range of mda.portRanges()) bus.register(range);

    bus.write(0x3b4, 0x5a0e, 16);
    expect(bus.read(0x3b4, 16)).toBe(0x5a0e);
    expect(mda.snapshot()).toMatchObject({ crtcIndex: 0x0e });
  });

  it("provides deterministic status and enforces byte-wide read/write ownership", () => {
    const mda = new MdaCompatibility();
    expect(mda.read(0x3ba, 8)).toBe(0);
    mda.advance(738);
    expect(mda.read(0x3ba, 8)).toBe(0x01);
    mda.advance(868 * 354);
    expect(mda.read(0x3ba, 8)).toBe(0x09);
    expect(() => mda.write(0x3ba, 0, 8)).toThrow("not writable");
    expect(() => mda.read(0x3b8, 32)).toThrow("8-bit");
    mda.reset();
    expect(mda.snapshot()).toMatchObject({ crtcIndex: 0, mode: 0, horizontalRetrace: false });
  });
});
