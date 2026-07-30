import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { VgaAttributeController } from "./vga-attribute-controller.js";

describe("VGA attribute controller", () => {
  it("retains all index/data register classes through the indexed write state machine", () => {
    const controller = new VgaAttributeController();
    const bus = new RebuiltMachinePortBus();
    for (const range of controller.portRanges()) bus.register(range);

    for (const index of [0x0f, 0x10, 0x11, 0x12, 0x13, 0x14]) {
      bus.write(0x3c0, index, 8);
      bus.write(0x3c0, 0xff, 8);
    }

    expect(controller.snapshot().data.slice(0x0f, 0x15)).toEqual([
      0x3f, 0xef, 0x3f, 0x3f, 0x0f, 0x0f
    ]);
    expect(bus.read(0x3c0, 8)).toBe(0x14);
    expect(bus.read(0x3c1, 8)).toBe(0x0f);
  });

  it("honors palette gating and resets the address/data flip-flop from status one", () => {
    const controller = new VgaAttributeController();
    controller.write(0x3c0, 0x20, 8);
    controller.write(0x3c0, 0x3f, 8);
    expect(controller.snapshot()).toMatchObject({
      index: 0,
      paletteEnabled: true,
      expectsData: false
    });
    expect(controller.read(0x3c1, 8)).toBe(0);

    controller.write(0x3c0, 0x01, 8);
    controller.resetAddressDataFlipFlop();
    controller.write(0x3c0, 0x22, 8);
    expect(controller.snapshot()).toMatchObject({
      index: 2,
      paletteEnabled: true,
      expectsData: true
    });
    expect(() => controller.write(0x3c1, 0, 8)).toThrow("not writable");
    expect(() => controller.read(0x3c0, 16)).toThrow("8-bit");
    controller.reset();
    expect(controller.snapshot()).toMatchObject({
      index: 0,
      paletteEnabled: false,
      expectsData: false
    });
  });
});
