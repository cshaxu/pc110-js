import { describe, expect, it } from "vitest";
import { performDmaTransfer } from "./dma-transfer.js";

describe("project-native DMA transfer adapter", () => {
  it("moves endpoint data into memory for DMA write transfers", () => {
    const memory = new Map<number, number>();
    const source = [0x34, 0x12];
    performDmaTransfer(
      { channel: 2, address: 0x1000, transferType: "write", unitBytes: 2, terminalCount: false },
      {
        read8: (address) => memory.get(address) ?? 0,
        write8: (address, value) => memory.set(address, value)
      },
      { read8: () => source.shift()!, write8: () => undefined }
    );
    expect([...memory.entries()]).toEqual([
      [0x1000, 0x34],
      [0x1001, 0x12]
    ]);
  });

  it("moves memory data into an endpoint for DMA read transfers and leaves verify unchanged", () => {
    const values: number[] = [];
    const memory = new Map([[0x2000, 0x56]]);
    const endpoint = { read8: () => 0, write8: (value: number) => values.push(value) };
    performDmaTransfer(
      { channel: 5, address: 0x2000, transferType: "read", unitBytes: 1, terminalCount: false },
      {
        read8: (address) => memory.get(address) ?? 0,
        write8: (address, value) => memory.set(address, value)
      },
      endpoint
    );
    performDmaTransfer(
      { channel: 5, address: 0x2000, transferType: "verify", unitBytes: 1, terminalCount: false },
      {
        read8: (address) => memory.get(address) ?? 0,
        write8: (address, value) => memory.set(address, value)
      },
      endpoint
    );
    expect(values).toEqual([0x56]);
  });
});
