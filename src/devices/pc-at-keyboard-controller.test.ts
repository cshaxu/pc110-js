import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { PcAtKeyboardController } from "./pc-at-keyboard-controller.js";

describe("project-native PC/AT 8042 adapter", () => {
  it("maps only byte-wide data and status/command ports", () => {
    const controller = new PcAtKeyboardController(
      () => {},
      () => {},
      () => {}
    );
    const bus = new RebuiltMachinePortBus();
    for (const range of controller.portRanges()) bus.register(range);

    bus.write(0x64, 0x20, 8);
    expect(bus.read(0x64, 8) & 0x01).toBe(0x01);
    expect(bus.read(0x60, 8)).toBe(0x10);
    expect(() => bus.read(0x60, 16)).toThrow("8-bit");
  });

  it("routes raw keyboard bytes through IRQ1 and keeps controller replies local", () => {
    const irqs: number[] = [];
    const controller = new PcAtKeyboardController(
      (irq) => irqs.push(irq),
      () => {},
      () => {}
    );
    controller.write(0x64, 0x60, 8);
    controller.write(0x60, 0x09, 8);
    expect(controller.read(0x60, 8)).toBe(0xaa);
    expect(controller.receiveKeyboardByte(0x1c)).toBe(true);
    expect(irqs).toEqual([1, 1]);
    expect(controller.read(0x60, 8)).toBe(0x1c);
    controller.write(0x64, 0x20, 8);
    expect(irqs).toEqual([1, 1]);
  });

  it("delivers keyboard BAT after the controller releases data and clock", () => {
    const irqs: number[] = [];
    const controller = new PcAtKeyboardController(
      (irq) => irqs.push(irq),
      () => {},
      () => {}
    );

    controller.write(0x64, 0x60, 8);
    controller.write(0x60, 0x4d, 8);

    expect(controller.read(0x60, 8)).toBe(0xaa);
    expect(irqs).toEqual([1]);
    expect(controller.keyboard.snapshot()).toEqual({
      dataEnabled: true,
      clockEnabled: true,
      batPending: false,
      scanningEnabled: true,
      awaitingLedValue: false
    });
  });

  it("does not deliver BAT while either controller line is held", () => {
    const controller = new PcAtKeyboardController(
      () => {},
      () => {},
      () => {}
    );

    controller.write(0x64, 0x60, 8);
    controller.write(0x60, 0x01, 8);
    expect(controller.controller.snapshot().outputBuffer).toBeUndefined();
    controller.write(0x64, 0x60, 8);
    controller.write(0x60, 0x09, 8);
    expect(controller.controller.snapshot().outputBuffer).toBe(0xaa);
  });

  it("routes selected keyboard commands through the native 8042 data channel", () => {
    const irqs: number[] = [];
    const controller = new PcAtKeyboardController(
      (irq) => irqs.push(irq),
      () => {},
      () => {}
    );
    controller.write(0x64, 0x60, 8);
    controller.write(0x60, 0x4d, 8);
    expect(controller.read(0x60, 8)).toBe(0xaa);

    controller.write(0x60, 0xed, 8);
    expect(controller.read(0x60, 8)).toBe(0xfa);
    controller.write(0x60, 0x07, 8);
    expect(controller.read(0x60, 8)).toBe(0xfa);
    controller.write(0x60, 0xf5, 8);
    expect(controller.read(0x60, 8)).toBe(0xfa);
    expect(controller.receiveKeyboardByte(0x1c)).toBe(false);
    controller.write(0x60, 0xf4, 8);
    expect(controller.read(0x60, 8)).toBe(0xfa);
    expect(controller.receiveKeyboardByte(0x1c)).toBe(true);
    expect(irqs).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("routes output-port writes and pulse requests through explicit callbacks", () => {
    const outputPorts: number[] = [];
    let resets = 0;
    const controller = new PcAtKeyboardController(
      () => {},
      (value) => outputPorts.push(value),
      () => (resets += 1)
    );
    controller.write(0x64, 0xd1, 8);
    controller.write(0x60, 0x02, 8);
    controller.write(0x64, 0xfe, 8);

    expect(outputPorts).toEqual([0x02]);
    expect(resets).toBe(1);
  });

  it("restores controller and keyboard state without replaying callbacks", () => {
    const irqs: number[] = [];
    const controller = new PcAtKeyboardController(
      (irq) => irqs.push(irq),
      () => {},
      () => {}
    );
    controller.write(0x64, 0x60, 8);
    controller.write(0x60, 0x4d, 8);
    const captured = controller.capture();
    controller.read(0x60, 8);

    controller.restore(captured);

    expect(controller.capture()).toEqual(captured);
    expect(controller.read(0x60, 8)).toBe(0xaa);
    expect(irqs).toEqual([1]);
  });
});
