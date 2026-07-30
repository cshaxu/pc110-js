import { describe, expect, it } from "vitest";
import { Dma8237 } from "./dma8237.js";

function configure(
  dma: Dma8237,
  channel: number,
  address: number,
  count: number,
  mode: number,
  page = 0
): void {
  dma.clearFlipFlop();
  dma.writeAddress(channel, address & 0xff);
  dma.writeAddress(channel, address >>> 8);
  dma.clearFlipFlop();
  dma.writeCount(channel, count & 0xff);
  dma.writeCount(channel, count >>> 8);
  dma.setPage(channel, page);
  dma.writeMode(mode | channel);
  dma.writeMask(channel);
}

describe("project-native 8237 DMA controller", () => {
  it("uses one controller flip-flop for address and count byte access", () => {
    const dma = new Dma8237();
    dma.writeAddress(1, 0x34);
    dma.writeAddress(1, 0x12);
    dma.writeCount(1, 0x78);
    dma.writeCount(1, 0x56);
    dma.clearFlipFlop();
    expect(dma.readAddress(1)).toBe(0x34);
    expect(dma.readAddress(1)).toBe(0x12);
    dma.clearFlipFlop();
    expect(dma.readCount(1)).toBe(0x78);
    expect(dma.readCount(1)).toBe(0x56);
  });

  it("grants an unmasked request with page address and terminal-count status", () => {
    const dma = new Dma8237();
    configure(dma, 2, 0x1234, 1, 0x46, 0x56);
    dma.setHardwareRequest(2, true);
    expect(dma.grant()).toMatchObject({
      channel: 2,
      address: 0x561234,
      transferType: "write",
      unitBytes: 1,
      terminalCount: false
    });
    expect(dma.grant()).toMatchObject({ terminalCount: true });
    expect(dma.readStatus()).toBe(0x04);
    expect(dma.readStatus()).toBe(0);
  });

  it("supports decrement, auto-initialize, masks, software requests, and rotating priority", () => {
    const dma = new Dma8237();
    configure(dma, 0, 2, 0, 0x70);
    dma.writeRequest(0x04);
    expect(dma.grant()).toMatchObject({ channel: 0, address: 2, terminalCount: true });
    expect(dma.snapshot(0)).toMatchObject({ currentAddress: 2, currentCount: 0, requested: true });

    configure(dma, 1, 3, 1, 0x61);
    dma.writeCommand(0x10);
    dma.setHardwareRequest(0, true);
    dma.setHardwareRequest(1, true);
    expect(dma.grant()).toMatchObject({ channel: 0 });
    expect(dma.grant()).toMatchObject({ channel: 1, address: 3 });
    dma.writeMask(0x05);
    expect(dma.snapshot(1).masked).toBe(true);
  });

  it("uses word-addressed DMA1 physical addresses and master-clear state", () => {
    const dma = new Dma8237({ wordAddressed: true });
    configure(dma, 1, 0x1234, 0, 0x49, 0x12);
    dma.setHardwareRequest(1, true);
    expect(dma.grant()).toMatchObject({ address: 0x122468, unitBytes: 2, terminalCount: true });
    dma.masterClear();
    expect(dma.snapshot(1)).toMatchObject({ masked: true, requested: false, terminalCount: false });
  });

  it("peeks and acknowledges a cascade grant without advancing its channel", () => {
    const dma = new Dma8237();
    configure(dma, 0, 0x1234, 3, 0xc0);
    dma.setHardwareRequest(0, true);
    expect(dma.peekGrant()).toMatchObject({ channel: 0, address: 0x1234 });
    expect(dma.acknowledgeCascade(0)).toBe(true);
    expect(dma.snapshot(0)).toMatchObject({ currentAddress: 0x1234, currentCount: 3 });
  });
});
