import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { FDC_DATA_PORT, FDC_DOR_PORT, FDC_MAIN_STATUS_PORT, PcAtFdc } from "./pc-at-fdc.js";

describe("PC/AT FDC port adapter", () => {
  it("owns the selected byte-wide port family and routes DOR reset IRQ6", () => {
    const irqs: number[] = [];
    const requests: boolean[] = [];
    const fdc = new PcAtFdc(
      (irq) => irqs.push(irq),
      (active) => requests.push(active)
    );
    const bus = new RebuiltMachinePortBus();
    for (const range of fdc.portRanges()) bus.register(range);

    bus.write(FDC_DOR_PORT, 0x0c, 8);
    expect(irqs).toEqual([6]);
    expect(requests.at(-1)).toBe(false);
    expect(bus.read(FDC_MAIN_STATUS_PORT, 8)).toBe(0x80);
    bus.write(FDC_DATA_PORT, 0x08, 8);
    expect(bus.read(FDC_DATA_PORT, 8)).toBe(0xc0);
    expect(bus.read(FDC_DATA_PORT, 8)).toBe(0);
    expect(() => bus.write(FDC_DOR_PORT, 0, 16)).toThrow("8-bit");
    expect(() => bus.read(FDC_DOR_PORT, 8)).toThrow("Unmapped I/O read");
  });

  it("restores controller state and recomputes the DMA request signal", () => {
    const requests: boolean[] = [];
    const fdc = new PcAtFdc(
      () => undefined,
      (active) => requests.push(active)
    );
    fdc.controller.writeDor(0x04);
    fdc.controller.writeData(0x03);
    const checkpoint = fdc.capture();

    fdc.controller.writeData(0xdf);
    fdc.restore(checkpoint);

    expect(fdc.capture()).toEqual(checkpoint);
    expect(requests.at(-1)).toBe(false);
  });
});
