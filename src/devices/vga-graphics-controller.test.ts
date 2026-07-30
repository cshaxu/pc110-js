import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { VgaGraphicsController } from "./vga-graphics-controller.js";

describe("VGA graphics controller", () => {
  it("retains every native register class with its defined bit width", () => {
    const controller = new VgaGraphicsController();
    const bus = new RebuiltMachinePortBus();
    for (const range of controller.portRanges()) bus.register(range);

    for (const index of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
      bus.write(0x3ce, index, 8);
      bus.write(0x3cf, 0xff, 8);
    }

    expect(controller.snapshot().data).toEqual([
      0x0f, 0x0f, 0x0f, 0x1f, 0x03, 0x1b, 0x0f, 0x0f, 0xff
    ]);
    expect(bus.read(0x3ce, 8)).toBe(8);
    expect(bus.read(0x3cf, 8)).toBe(0xff);
    expect(controller.readRegister(5)).toBe(0x1b);
  });

  it("rejects undefined data and invalid widths, then resets", () => {
    const controller = new VgaGraphicsController();
    controller.write(0x3ce, 9, 8);
    expect(() => controller.write(0x3cf, 0, 8)).toThrow("not defined");
    expect(() => controller.read(0x3ce, 16)).toThrow("8-bit");
    expect(() => controller.readRegister(9)).toThrow("not defined");

    controller.reset();
    expect(controller.snapshot()).toEqual({ index: 0, data: Array(9).fill(0) });
  });
});
