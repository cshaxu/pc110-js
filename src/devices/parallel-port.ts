import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";

export const LPT1_BASE_PORT = 0x378;
export const LPT1_STATUS_PORT = LPT1_BASE_PORT + 1;
export const LPT1_CONTROL_PORT = LPT1_BASE_PORT + 2;

const STATUS_ALWAYS_SET = 0x07;
const STATUS_NO_ERROR = 0x08;
const STATUS_ACKNOWLEDGE = 0x40;
const STATUS_NOT_BUSY = 0x80;
const CONTROL_IRQ_ENABLE = 0x10;
const CONTROL_ALWAYS_SET = 0xe0;

export interface ParallelPortPortRange {
  readonly start: number;
  readonly end: number;
  readonly read: (port: number, width: PortWidth) => number;
  readonly write: (port: number, value: number, width: PortWidth) => void;
}

export interface ParallelPortSnapshot {
  readonly data: number;
  readonly status: number;
  readonly control: number;
}

export interface ParallelPortOptions {
  readonly basePort?: number;
  readonly onInterrupt?: (active: boolean) => void;
  readonly onTransmit?: (value: number) => void;
}

/**
 * Project-native PC-compatible unidirectional parallel-port register model.
 * Printer transport remains outside the device; callers observe data writes
 * and drive printer-side status inputs through setStatus().
 */
export class ParallelPort {
  private readonly basePort: number;
  private readonly onInterrupt: (active: boolean) => void;
  private readonly onTransmit: (value: number) => void;
  private data = 0;
  private status = STATUS_ALWAYS_SET | STATUS_NO_ERROR | STATUS_ACKNOWLEDGE | STATUS_NOT_BUSY;
  private control = CONTROL_ALWAYS_SET;
  private interruptActive = false;

  public constructor(options: ParallelPortOptions = {}) {
    this.basePort = options.basePort ?? LPT1_BASE_PORT;
    this.onInterrupt = options.onInterrupt ?? (() => undefined);
    this.onTransmit = options.onTransmit ?? (() => undefined);
    if (!Number.isInteger(this.basePort) || this.basePort < 0 || this.basePort > 0xfffd)
      throw new RangeError(`Parallel-port base is outside the I/O address space: ${this.basePort}`);
    this.updateInterrupt();
  }

  public reset(): void {
    this.data = 0;
    this.status = STATUS_ALWAYS_SET | STATUS_NO_ERROR | STATUS_ACKNOWLEDGE | STATUS_NOT_BUSY;
    this.control = CONTROL_ALWAYS_SET;
    this.updateInterrupt();
  }

  public read(port: number, width: PortWidth): number {
    this.requireBytePort(port, width);
    switch (port - this.basePort) {
      case 0:
        return this.data;
      case 1:
        return this.readStatus();
      case 2:
        return this.control;
      default:
        throw new RangeError(`Parallel-port port is not mapped: 0x${port.toString(16)}`);
    }
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requireBytePort(port, width);
    switch (port - this.basePort) {
      case 0:
        this.data = value & 0xff;
        this.onTransmit(this.data);
        return;
      case 2:
        this.control = (value & 0x1f) | CONTROL_ALWAYS_SET;
        this.updateInterrupt();
        return;
      default:
        throw new RangeError(`Parallel-port port is read-only: 0x${port.toString(16)}`);
    }
  }

  /** Sets raw printer-side status inputs; low ACK can request IRQ7 when enabled. */
  public setStatus(value: number): void {
    this.status = (value & 0xf8) | STATUS_ALWAYS_SET;
    this.updateInterrupt();
  }

  public snapshot(): ParallelPortSnapshot {
    return { data: this.data, status: this.status, control: this.control };
  }

  public portRanges(): readonly ParallelPortPortRange[] {
    return [
      {
        start: this.basePort,
        end: this.basePort + 2,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      }
    ];
  }

  private readStatus(): number {
    const result = this.status;
    this.status |= STATUS_ACKNOWLEDGE | STATUS_NOT_BUSY;
    this.updateInterrupt();
    return result;
  }

  private updateInterrupt(): void {
    const active =
      Boolean(this.control & CONTROL_IRQ_ENABLE) && !(this.status & STATUS_ACKNOWLEDGE);
    if (active === this.interruptActive) return;
    this.interruptActive = active;
    this.onInterrupt(active);
  }

  private requireBytePort(port: number, width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(`Parallel port supports 8-bit I/O only, received ${width}-bit`);
    if (!Number.isInteger(port) || port < this.basePort || port > this.basePort + 2)
      throw new RangeError(`Parallel-port port is not mapped: 0x${port.toString(16)}`);
  }
}
