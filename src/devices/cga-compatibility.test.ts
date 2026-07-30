import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { CgaCompatibility } from "./cga-compatibility.js";

describe("VGA CGA compatibility ports", () => {
  it("retains CRTC, mode, and color state through the complete compatibility group", () => {
    const cga = new CgaCompatibility();
    const bus = new RebuiltMachinePortBus();
    for (const range of cga.portRanges()) bus.register(range);
    bus.write(0x3d4, 0x1f, 8);
    bus.write(0x3d5, 0x43, 8);
    bus.write(0x3d8, 0x29, 8);
    bus.write(0x3d9, 0x1e, 8);
    expect(bus.read(0x3d4, 8)).toBe(0x1f);
    expect(bus.read(0x3d5, 8)).toBe(0x43);
    expect(bus.read(0x3d8, 8)).toBe(0x29);
    expect(bus.read(0x3d9, 8)).toBe(0x1e);
  });

  it("exposes deterministic retrace state and rejects invalid width/write ownership", () => {
    const cga = new CgaCompatibility();
    expect(cga.read(0x3da, 8)).toBe(0);
    cga.advance();
    expect(cga.read(0x3da, 8)).toBe(0x01);
    cga.advance();
    expect(cga.read(0x3da, 8)).toBe(0x08);
    expect(() => cga.write(0x3da, 0, 8)).toThrow("not writable");
    expect(() => cga.read(0x3d8, 16)).toThrow("8-bit");
    cga.reset();
    expect(cga.snapshot()).toMatchObject({ crtcIndex: 0, mode: 0, color: 0 });
  });
});
