import { describe, expect, it } from "vitest";
import { RebuiltPortAccessError } from "../cpu/rebuilt/io/port-bus.js";
import { RebuiltMachinePortBus, type RebuiltPortTraceEvent } from "./rebuilt-port-bus.js";

describe("RebuiltMachinePortBus", () => {
  it("dispatches width-aware reads and writes with trace events", () => {
    const accesses: Array<[string, number, number, number]> = [];
    const trace: RebuiltPortTraceEvent[] = [];
    const bus = new RebuiltMachinePortBus((event) => trace.push(event));
    bus.register({
      start: 0x60,
      end: 0x64,
      read: (port, width) => {
        accesses.push(["read", port, width, 0x1234_5678]);
        return 0x1234_5678;
      },
      write: (port, value, width) => accesses.push(["write", port, width, value])
    });

    expect(bus.read(0x60, 8)).toBe(0x78);
    expect(bus.read(0x61, 16)).toBe(0x5678);
    bus.write(0x64, 0x1234_5678, 16);
    bus.write(0x63, 0x1234_5678, 32);

    expect(accesses).toEqual([
      ["read", 0x60, 8, 0x1234_5678],
      ["read", 0x61, 16, 0x1234_5678],
      ["write", 0x64, 16, 0x5678],
      ["write", 0x63, 32, 0x1234_5678]
    ]);
    expect(trace).toEqual([
      { direction: "read", port: 0x60, width: 8, value: 0x78 },
      { direction: "read", port: 0x61, width: 16, value: 0x5678 },
      { direction: "write", port: 0x64, width: 16, value: 0x5678 },
      { direction: "write", port: 0x63, width: 32, value: 0x1234_5678 }
    ]);
  });

  it("keeps read and write ownership independent while rejecting conflicts", () => {
    const bus = new RebuiltMachinePortBus();
    bus.register({ start: 0x70, end: 0x70, read: () => 0xa5 });
    bus.register({ start: 0x70, end: 0x70, write: () => undefined });

    expect(() => bus.register({ start: 0x70, end: 0x70, read: () => 0 })).toThrow(
      RebuiltPortAccessError
    );
    expect(() => bus.read(0x71, 8)).toThrow("Unmapped I/O read port");
    expect(() => bus.write(0x71, 0, 8)).toThrow("Unmapped I/O write port");
  });

  it("can model unpopulated machine I/O as floating reads and ignored writes", () => {
    const bus = new RebuiltMachinePortBus(undefined, {
      unmappedRead: "ff",
      unmappedWrite: "ignore"
    });

    expect(bus.read(0x3bc, 8)).toBe(0xff);
    expect(bus.read(0x1234, 16)).toBe(0xffff);
    expect(() => bus.write(0x3bc, 0x12, 8)).not.toThrow();
  });
});
