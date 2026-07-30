import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { PcAtDma } from "./pc-at-dma.js";

describe("project-native PC/AT DMA", () => {
  it("maps DMA0 address/count/control and selected page registers", () => {
    const dma = new PcAtDma();
    const bus = new RebuiltMachinePortBus();
    for (const range of dma.portRanges()) bus.register(range);
    bus.write(0x0c, 0, 8);
    bus.write(0x04, 0x34, 8);
    bus.write(0x04, 0x12, 8);
    bus.write(0x05, 0x78, 8);
    bus.write(0x05, 0x56, 8);
    bus.write(0x81, 0xab, 8);
    bus.write(0x0a, 0x02, 8);
    bus.write(0x0b, 0x46, 8);
    bus.write(0x09, 0x06, 8);

    expect(dma.grantFromController(0)).toMatchObject({ channel: 2, address: 0xab1234 });
    expect(bus.read(0x81, 8)).toBe(0xab);
    expect(() => bus.write(0x04, 0, 16)).toThrow("8-bit");
  });

  it("maps DMA1 even ports as word-addressed channels and rejects odd ports", () => {
    const dma = new PcAtDma();
    const bus = new RebuiltMachinePortBus();
    for (const range of dma.portRanges()) bus.register(range);
    bus.write(0xd8, 0, 8);
    bus.write(0xc4, 0x34, 8);
    bus.write(0xc4, 0x12, 8);
    bus.write(0xc6, 0, 8);
    bus.write(0xc6, 0, 8);
    bus.write(0x8b, 0x56, 8);
    bus.write(0xd4, 0x01, 8);
    bus.write(0xd6, 0x49, 8);
    dma.setHardwareRequest(5, true);

    expect(dma.grantFromController(1)).toMatchObject({
      channel: 1,
      address: 0x562468,
      unitBytes: 2
    });
    expect(() => bus.read(0xc1, 8)).toThrow("not readable");
  });

  it("keeps DMA0 and DMA1 state independent and resets both controllers", () => {
    const dma = new PcAtDma();
    dma.setHardwareRequest(0, true);
    dma.setHardwareRequest(5, true);
    expect(dma.snapshot(0).requested).toBe(true);
    expect(dma.snapshot(5).requested).toBe(true);
    dma.reset();
    expect(dma.snapshot(0)).toMatchObject({ requested: false, masked: true });
    expect(dma.snapshot(5)).toMatchObject({ requested: false, masked: true });
  });

  it("arbitrates a DMA0 request through unmasked DMA1 channel 4 cascade", () => {
    const dma = new PcAtDma();
    const bus = new RebuiltMachinePortBus();
    for (const range of dma.portRanges()) bus.register(range);
    bus.write(0x0c, 0, 8);
    bus.write(0x00, 0x34, 8);
    bus.write(0x00, 0x12, 8);
    bus.write(0x01, 0, 8);
    bus.write(0x01, 0, 8);
    bus.write(0x0a, 0x00, 8);
    bus.write(0x0b, 0x44, 8);
    bus.write(0xdc, 0, 8);
    dma.setHardwareRequest(0, true);

    expect(dma.grant()).toMatchObject({ channel: 0, address: 0x1234 });
    expect(dma.dma1.snapshot(0)).toMatchObject({ currentAddress: 0, currentCount: 0 });
  });
});
