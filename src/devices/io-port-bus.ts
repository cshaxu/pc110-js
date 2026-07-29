export type PortRead8 = (port: number) => number;
export type PortWrite8 = (port: number, value: number) => void;

export interface IoPortRange {
  readonly start: number;
  readonly end: number;
  readonly readPort8?: PortRead8;
  readonly writePort8?: PortWrite8;
}

export interface IoPortTraceEvent {
  readonly direction: "read" | "write";
  readonly port: number;
  readonly value: number;
}

export type IoPortTrace = (event: IoPortTraceEvent) => void;

function normalizePort(port: number): number {
  if (!Number.isInteger(port) || port < 0 || port > 0xffff) {
    throw new RangeError(`I/O port is outside the 16-bit address space: ${port}`);
  }
  return port;
}

export class IoPortBus {
  private readonly readers = new Map<number, PortRead8>();
  private readonly writers = new Map<number, PortWrite8>();

  public constructor(private readonly trace?: IoPortTrace) {}

  public register(range: IoPortRange): void {
    const start = normalizePort(range.start);
    const end = normalizePort(range.end);
    if (end < start) throw new RangeError("I/O port range end precedes its start");
    if (!range.readPort8 && !range.writePort8) {
      throw new Error("I/O port range requires a read or write handler");
    }
    for (let port = start; port <= end; port += 1) {
      if (range.readPort8 && this.readers.has(port)) {
        throw new Error(`I/O read port is already mapped: 0x${port.toString(16)}`);
      }
      if (range.writePort8 && this.writers.has(port)) {
        throw new Error(`I/O write port is already mapped: 0x${port.toString(16)}`);
      }
    }
    for (let port = start; port <= end; port += 1) {
      if (range.readPort8) this.readers.set(port, range.readPort8);
      if (range.writePort8) this.writers.set(port, range.writePort8);
    }
  }

  public readPort8(port: number): number {
    const normalizedPort = normalizePort(port);
    const reader = this.readers.get(normalizedPort);
    if (!reader) throw new Error(`Unmapped I/O read port: 0x${normalizedPort.toString(16)}`);
    const value = reader(normalizedPort) & 0xff;
    this.trace?.({ direction: "read", port: normalizedPort, value });
    return value;
  }

  public writePort8(port: number, value: number): void {
    const normalizedPort = normalizePort(port);
    const writer = this.writers.get(normalizedPort);
    if (!writer) throw new Error(`Unmapped I/O write port: 0x${normalizedPort.toString(16)}`);
    const normalizedValue = value & 0xff;
    writer(normalizedPort, normalizedValue);
    this.trace?.({ direction: "write", port: normalizedPort, value: normalizedValue });
  }
}
