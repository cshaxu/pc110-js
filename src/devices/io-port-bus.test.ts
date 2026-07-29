import { describe, expect, it } from "vitest";
import { IoPortBus, type IoPortTraceEvent } from "./io-port-bus.js";

describe("I/O port bus", () => {
  it("dispatches 8-bit reads and writes across registered ranges", () => {
    const writes: Array<[number, number]> = [];
    const trace: IoPortTraceEvent[] = [];
    const bus = new IoPortBus((event) => trace.push(event));
    bus.register({
      start: 0x60,
      end: 0x64,
      readPort8: (port) => port + 0x100,
      writePort8: (port, value) => writes.push([port, value])
    });

    expect(bus.readPort8(0x64)).toBe(0x64);
    bus.writePort8(0x61, 0x1ff);

    expect(writes).toEqual([[0x61, 0xff]]);
    expect(trace).toEqual([
      { direction: "read", port: 0x64, value: 0x64 },
      { direction: "write", port: 0x61, value: 0xff }
    ]);
  });

  it("keeps read and write ownership independent while rejecting overlaps", () => {
    const bus = new IoPortBus();
    bus.register({ start: 0x70, end: 0x70, readPort8: () => 0xa5 });
    bus.register({ start: 0x70, end: 0x70, writePort8: () => undefined });

    expect(() => bus.register({ start: 0x70, end: 0x70, readPort8: () => 0 })).toThrow(
      "already mapped"
    );
    expect(() => bus.readPort8(0x71)).toThrow("Unmapped I/O read port");
    expect(() => bus.writePort8(0x71, 0)).toThrow("Unmapped I/O write port");
  });
});
