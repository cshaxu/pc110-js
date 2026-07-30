import {
  normalizePort,
  RebuiltPortAccessError,
  type PortWidth,
  type RebuiltPortBus
} from "../cpu/rebuilt/io/port-bus.js";

export type RebuiltPortRead = (port: number, width: PortWidth) => number;
export type RebuiltPortWrite = (port: number, value: number, width: PortWidth) => void;

export interface RebuiltPortRange {
  readonly start: number;
  readonly end: number;
  readonly read?: RebuiltPortRead;
  readonly write?: RebuiltPortWrite;
}

export interface RebuiltPortTraceEvent {
  readonly direction: "read" | "write";
  readonly port: number;
  readonly width: PortWidth;
  readonly value: number;
}

export type RebuiltPortTrace = (event: RebuiltPortTraceEvent) => void;

function maskForWidth(width: PortWidth): number {
  return width === 8 ? 0xff : width === 16 ? 0xffff : 0xffffffff;
}

export class RebuiltMachinePortBus implements RebuiltPortBus {
  private readonly readers = new Map<number, RebuiltPortRead>();
  private readonly writers = new Map<number, RebuiltPortWrite>();

  public constructor(private readonly trace?: RebuiltPortTrace) {}

  public register(range: RebuiltPortRange): void {
    const start = normalizePort(range.start);
    const end = normalizePort(range.end);
    if (end < start) throw new RebuiltPortAccessError("I/O port range end precedes its start");
    if (!range.read && !range.write)
      throw new RebuiltPortAccessError("I/O port range requires a read or write handler");
    for (let port = start; port <= end; port += 1) {
      if (range.read && this.readers.has(port))
        throw new RebuiltPortAccessError(`I/O read port is already mapped: 0x${port.toString(16)}`);
      if (range.write && this.writers.has(port))
        throw new RebuiltPortAccessError(
          `I/O write port is already mapped: 0x${port.toString(16)}`
        );
    }
    for (let port = start; port <= end; port += 1) {
      if (range.read) this.readers.set(port, range.read);
      if (range.write) this.writers.set(port, range.write);
    }
  }

  public read(port: number, width: PortWidth): number {
    const normalizedPort = normalizePort(port);
    const reader = this.readers.get(normalizedPort);
    if (!reader)
      throw new RebuiltPortAccessError(`Unmapped I/O read port: 0x${normalizedPort.toString(16)}`);
    const value = reader(normalizedPort, width) & maskForWidth(width);
    this.trace?.({ direction: "read", port: normalizedPort, width, value });
    return value;
  }

  public write(port: number, value: number, width: PortWidth): void {
    const normalizedPort = normalizePort(port);
    const writer = this.writers.get(normalizedPort);
    if (!writer)
      throw new RebuiltPortAccessError(`Unmapped I/O write port: 0x${normalizedPort.toString(16)}`);
    const normalizedValue = value & maskForWidth(width);
    writer(normalizedPort, normalizedValue, width);
    this.trace?.({ direction: "write", port: normalizedPort, width, value: normalizedValue });
  }
}
