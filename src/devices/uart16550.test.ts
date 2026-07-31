import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { COM1_BASE_PORT, Uart16550 } from "./uart16550.js";

describe("16550 UART", () => {
  it("owns the complete COM1 register family including DLAB and scratch state", () => {
    const uart = new Uart16550();
    const bus = new RebuiltMachinePortBus();
    for (const range of uart.portRanges()) bus.register(range);

    expect(bus.read(0x3fa, 8)).toBe(0x01);
    bus.write(0x3fb, 0x80, 8);
    bus.write(0x3f8, 0x34, 8);
    bus.write(0x3f9, 0x12, 8);
    expect(bus.read(0x3f8, 8)).toBe(0x34);
    expect(bus.read(0x3f9, 8)).toBe(0x12);
    bus.write(0x3fb, 0x03, 8);
    bus.write(0x3ff, 0xa5, 8);
    expect(bus.read(0x3ff, 8)).toBe(0xa5);
    expect(bus.read(0x3fd, 8)).toBe(0x60);
    expect(() => bus.read(0x3fa, 16)).toThrow("8-bit");
  });

  it("models receive FIFO thresholds, line status, and interrupt priority", () => {
    const events: boolean[] = [];
    const uart = new Uart16550({ onInterrupt: (active) => events.push(active) });
    uart.write(COM1_BASE_PORT + 1, 0x07, 8);
    uart.write(COM1_BASE_PORT + 2, 0x41, 8);
    uart.receiveByte(0x10);
    uart.receiveByte(0x11);
    uart.receiveByte(0x12);
    expect(uart.read(COM1_BASE_PORT + 2, 8)).toBe(0xc2);
    uart.receiveByte(0x13);
    expect(uart.read(COM1_BASE_PORT + 2, 8)).toBe(0xc4);
    uart.receiveByte(0x14, 0x04);
    expect(uart.read(COM1_BASE_PORT + 2, 8)).toBe(0xc6);
    expect(uart.read(COM1_BASE_PORT + 5, 8) & 0x04).toBe(0x04);
    expect(uart.read(COM1_BASE_PORT + 5, 8) & 0x04).toBe(0);
    expect(events).toContain(true);
  });

  it("clears receive, transmitter, and modem interrupt causes through their architectural actions", () => {
    const uart = new Uart16550();
    uart.write(COM1_BASE_PORT + 1, 0x0b, 8);
    expect(uart.read(COM1_BASE_PORT + 2, 8)).toBe(0x02);
    expect(uart.read(COM1_BASE_PORT + 2, 8)).toBe(0x01);
    uart.receiveByte(0xa5);
    expect(uart.read(COM1_BASE_PORT + 2, 8)).toBe(0x04);
    expect(uart.read(COM1_BASE_PORT, 8)).toBe(0xa5);
    uart.setModemInputs({ cts: true, dsr: true });
    expect(uart.read(COM1_BASE_PORT + 2, 8)).toBe(0x00);
    expect(uart.read(COM1_BASE_PORT + 6, 8)).toBe(0x33);
    expect(uart.read(COM1_BASE_PORT + 2, 8)).toBe(0x01);
  });

  it("supports transmit observation, loopback, FIFO reset, and reset defaults", () => {
    const transmitted: number[] = [];
    const uart = new Uart16550({ onTransmit: (value) => transmitted.push(value) });
    uart.write(COM1_BASE_PORT, 0x41, 8);
    expect(transmitted).toEqual([0x41]);
    uart.write(COM1_BASE_PORT + 4, 0x10, 8);
    uart.write(COM1_BASE_PORT, 0x42, 8);
    expect(uart.read(COM1_BASE_PORT, 8)).toBe(0x42);
    uart.write(COM1_BASE_PORT + 2, 0x07, 8);
    expect(uart.snapshot().receiveFifo).toEqual([]);
    uart.reset();
    expect(uart.snapshot()).toMatchObject({ divisor: 1, lineStatus: 0x60, interruptEnable: 0 });
  });

  it("restores FIFO, modem, and interrupt-selection state without host transport", () => {
    const uart = new Uart16550();
    uart.write(COM1_BASE_PORT + 1, 0x09, 8);
    uart.receiveByte(0xa5);
    uart.setModemInputs({ cts: true });
    const checkpoint = uart.capture();

    uart.read(COM1_BASE_PORT, 8);
    uart.read(COM1_BASE_PORT + 6, 8);
    uart.reset();
    uart.restore(checkpoint);

    expect(uart.capture()).toEqual(checkpoint);
    expect(uart.read(COM1_BASE_PORT + 2, 8)).toBe(0x04);
    expect(uart.read(COM1_BASE_PORT, 8)).toBe(0xa5);
  });
});
