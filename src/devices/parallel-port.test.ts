import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { LPT1_BASE_PORT, ParallelPort } from "./parallel-port.js";

describe("PC-compatible parallel port", () => {
  it("owns data, status, and control with established reset values", () => {
    const port = new ParallelPort();
    const bus = new RebuiltMachinePortBus();
    for (const range of port.portRanges()) bus.register(range);

    expect(bus.read(LPT1_BASE_PORT + 1, 8)).toBe(0xcf);
    expect(bus.read(LPT1_BASE_PORT + 2, 8)).toBe(0xe0);
    bus.write(LPT1_BASE_PORT, 0xa5, 8);
    bus.write(LPT1_BASE_PORT + 2, 0x1b, 8);
    expect(bus.read(LPT1_BASE_PORT, 8)).toBe(0xa5);
    expect(bus.read(LPT1_BASE_PORT + 2, 8)).toBe(0xfb);
    expect(() => bus.write(LPT1_BASE_PORT + 1, 0, 8)).toThrow("read-only");
    expect(() => bus.read(LPT1_BASE_PORT, 16)).toThrow("8-bit");
  });

  it("observes transmitted bytes and routes low ACK through an enabled IRQ", () => {
    const bytes: number[] = [];
    const interrupts: boolean[] = [];
    const port = new ParallelPort({
      onInterrupt: (active) => interrupts.push(active),
      onTransmit: (value) => bytes.push(value)
    });

    port.write(LPT1_BASE_PORT, 0x41, 8);
    expect(bytes).toEqual([0x41]);
    port.write(LPT1_BASE_PORT + 2, 0x10, 8);
    port.setStatus(0x8f);
    expect(interrupts).toEqual([true]);
    expect(port.read(LPT1_BASE_PORT + 1, 8)).toBe(0x8f);
    expect(interrupts).toEqual([true, false]);
  });

  it("preserves input status semantics across reset", () => {
    const port = new ParallelPort();
    port.setStatus(0x20);
    expect(port.snapshot().status).toBe(0x27);
    port.reset();
    expect(port.snapshot()).toEqual({ data: 0, status: 0xcf, control: 0xe0 });
  });

  it("restores register and pending-IRQ state without printer transport", () => {
    const port = new ParallelPort();
    port.write(LPT1_BASE_PORT, 0xa5, 8);
    port.write(LPT1_BASE_PORT + 2, 0x10, 8);
    port.setStatus(0x8f);
    const checkpoint = port.capture();

    port.read(LPT1_BASE_PORT + 1, 8);
    port.reset();
    port.restore(checkpoint);

    expect(port.capture()).toEqual(checkpoint);
    expect(port.read(LPT1_BASE_PORT, 8)).toBe(0xa5);
    expect(port.read(LPT1_BASE_PORT + 1, 8)).toBe(0x8f);
  });
});
