import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";

export const COM1_BASE_PORT = 0x3f8;
export const COM1_LAST_PORT = 0x3ff;

const LCR_DLAB = 0x80;
const MCR_LOOPBACK = 0x10;
const LSR_DATA_READY = 0x01;
const LSR_OVERRUN = 0x02;
const LSR_PARITY = 0x04;
const LSR_FRAMING = 0x08;
const LSR_BREAK = 0x10;
const LSR_THR_EMPTY = 0x20;
const LSR_TRANSMITTER_EMPTY = 0x40;
const LSR_ERROR = LSR_OVERRUN | LSR_PARITY | LSR_FRAMING | LSR_BREAK;
const IER_RECEIVED_DATA = 0x01;
const IER_THR_EMPTY = 0x02;
const IER_LINE_STATUS = 0x04;
const IER_MODEM_STATUS = 0x08;
const IIR_NO_INTERRUPT = 0x01;
const IIR_MODEM_STATUS = 0x00;
const IIR_THR_EMPTY = 0x02;
const IIR_RECEIVED_DATA = 0x04;
const IIR_LINE_STATUS = 0x06;
const FCR_ENABLE = 0x01;
const FCR_CLEAR_RECEIVE = 0x02;
const FCR_CLEAR_TRANSMIT = 0x04;
const FCR_TRIGGER_MASK = 0xc0;
const MSR_DELTA_MASK = 0x0f;
const MSR_CTS = 0x10;
const MSR_DSR = 0x20;
const MSR_RI = 0x40;
const MSR_RLSD = 0x80;

export interface Uart16550PortRange {
  readonly start: number;
  readonly end: number;
  readonly read: (port: number, width: PortWidth) => number;
  readonly write: (port: number, value: number, width: PortWidth) => void;
}

export interface Uart16550Snapshot {
  readonly divisor: number;
  readonly interruptEnable: number;
  readonly interruptIdentification: number;
  readonly fifoControl: number;
  readonly lineControl: number;
  readonly modemControl: number;
  readonly lineStatus: number;
  readonly modemStatus: number;
  readonly scratch: number;
  readonly receiveFifo: readonly number[];
  readonly transmitFifo: readonly number[];
}

export interface Uart16550State extends Uart16550Snapshot {
  readonly thrInterruptPending: boolean;
  readonly interruptActive: boolean;
}

export interface Uart16550Options {
  readonly basePort?: number;
  readonly fifoCapacity?: number;
  readonly onInterrupt?: (active: boolean) => void;
  readonly onTransmit?: (value: number) => void;
}

/**
 * Project-native 16550-compatible UART register model. Host transports remain
 * outside this device; callers inject received bytes and observe transmission.
 */
export class Uart16550 {
  private readonly basePort: number;
  private readonly fifoCapacity: number;
  private readonly onInterrupt: (active: boolean) => void;
  private readonly onTransmit: (value: number) => void;
  private divisor = 1;
  private interruptEnable = 0;
  private fifoControl = 0;
  private lineControl = 0;
  private modemControl = 0;
  private lineStatus = LSR_THR_EMPTY | LSR_TRANSMITTER_EMPTY;
  private modemStatus = 0;
  private scratch = 0;
  private readonly receiveFifo: number[] = [];
  private readonly transmitFifo: number[] = [];
  private thrInterruptPending = true;
  private interruptActive = false;

  public constructor(options: Uart16550Options = {}) {
    this.basePort = options.basePort ?? COM1_BASE_PORT;
    this.fifoCapacity = options.fifoCapacity ?? 16;
    this.onInterrupt = options.onInterrupt ?? (() => undefined);
    this.onTransmit = options.onTransmit ?? (() => undefined);
    if (!Number.isInteger(this.basePort) || this.basePort < 0 || this.basePort > 0xfff8)
      throw new RangeError(`UART base port is outside the I/O address space: ${this.basePort}`);
    if (!Number.isInteger(this.fifoCapacity) || this.fifoCapacity < 1)
      throw new RangeError(`UART FIFO capacity must be a positive integer: ${this.fifoCapacity}`);
    this.updateInterrupt();
  }

  public reset(): void {
    this.divisor = 1;
    this.interruptEnable = 0;
    this.fifoControl = 0;
    this.lineControl = 0;
    this.modemControl = 0;
    this.lineStatus = LSR_THR_EMPTY | LSR_TRANSMITTER_EMPTY;
    this.modemStatus = 0;
    this.scratch = 0;
    this.receiveFifo.length = 0;
    this.transmitFifo.length = 0;
    this.thrInterruptPending = true;
    this.updateInterrupt();
  }

  public read(port: number, width: PortWidth): number {
    this.requireBytePort(port, width);
    switch (port - this.basePort) {
      case 0:
        return this.lineControl & LCR_DLAB ? this.divisor & 0xff : this.readReceiveBuffer();
      case 1:
        return this.lineControl & LCR_DLAB ? this.divisor >>> 8 : this.interruptEnable;
      case 2:
        return this.readInterruptIdentification();
      case 3:
        return this.lineControl;
      case 4:
        return this.modemControl;
      case 5:
        return this.readLineStatus();
      case 6:
        return this.readModemStatus();
      case 7:
        return this.scratch;
      default:
        throw new RangeError(`UART port is not mapped: 0x${port.toString(16)}`);
    }
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requireBytePort(port, width);
    const byte = value & 0xff;
    switch (port - this.basePort) {
      case 0:
        if (this.lineControl & LCR_DLAB) this.divisor = (this.divisor & 0xff00) | byte;
        else this.writeTransmitHolding(byte);
        break;
      case 1:
        if (this.lineControl & LCR_DLAB) this.divisor = (this.divisor & 0x00ff) | (byte << 8);
        else this.interruptEnable = byte & 0x0f;
        break;
      case 2:
        this.writeFifoControl(byte);
        break;
      case 3:
        this.lineControl = byte;
        break;
      case 4:
        this.writeModemControl(byte);
        break;
      case 5:
      case 6:
        throw new RangeError(`UART port is read-only: 0x${port.toString(16)}`);
      case 7:
        this.scratch = byte;
        break;
      default:
        throw new RangeError(`UART port is not mapped: 0x${port.toString(16)}`);
    }
    this.updateInterrupt();
  }

  public receiveByte(value: number, lineStatus = 0): void {
    const byte = value & 0xff;
    if (this.receiveFifo.length >= this.receiveCapacity()) this.lineStatus |= LSR_OVERRUN;
    else this.receiveFifo.push(byte);
    this.lineStatus |= LSR_DATA_READY | (lineStatus & LSR_ERROR);
    this.updateInterrupt();
  }

  public setModemInputs(inputs: {
    readonly cts?: boolean;
    readonly dsr?: boolean;
    readonly ri?: boolean;
    readonly rlsd?: boolean;
  }): void {
    const next =
      (inputs.cts ? MSR_CTS : 0) |
      (inputs.dsr ? MSR_DSR : 0) |
      (inputs.ri ? MSR_RI : 0) |
      (inputs.rlsd ? MSR_RLSD : 0);
    const previous = this.modemStatus & 0xf0;
    let deltas = 0;
    if ((previous ^ next) & MSR_CTS) deltas |= 0x01;
    if ((previous ^ next) & MSR_DSR) deltas |= 0x02;
    if (previous & MSR_RI && !(next & MSR_RI)) deltas |= 0x04;
    if ((previous ^ next) & MSR_RLSD) deltas |= 0x08;
    this.modemStatus = next | (this.modemStatus & MSR_DELTA_MASK) | deltas;
    this.updateInterrupt();
  }

  public snapshot(): Uart16550Snapshot {
    return {
      divisor: this.divisor,
      interruptEnable: this.interruptEnable,
      interruptIdentification: this.interruptIdentification(),
      fifoControl: this.fifoControl,
      lineControl: this.lineControl,
      modemControl: this.modemControl,
      lineStatus: this.lineStatus,
      modemStatus: this.modemStatus,
      scratch: this.scratch,
      receiveFifo: [...this.receiveFifo],
      transmitFifo: [...this.transmitFifo]
    };
  }

  public capture(): Uart16550State {
    return {
      ...this.snapshot(),
      thrInterruptPending: this.thrInterruptPending,
      interruptActive: this.interruptActive
    };
  }

  public restore(state: Uart16550State): void {
    if (
      !Number.isInteger(state.divisor) ||
      state.divisor < 0 ||
      state.divisor > 0xffff ||
      state.receiveFifo.length > this.fifoCapacity ||
      state.transmitFifo.length > this.fifoCapacity
    )
      throw new RangeError("UART checkpoint state is invalid");
    this.divisor = state.divisor;
    this.interruptEnable = state.interruptEnable & 0x0f;
    this.fifoControl = state.fifoControl & (FCR_ENABLE | FCR_TRIGGER_MASK);
    this.lineControl = state.lineControl & 0xff;
    this.modemControl = state.modemControl & 0x1f;
    this.lineStatus = state.lineStatus & 0xff;
    this.modemStatus = state.modemStatus & 0xff;
    this.scratch = state.scratch & 0xff;
    this.receiveFifo.splice(
      0,
      this.receiveFifo.length,
      ...state.receiveFifo.map((value) => value & 0xff)
    );
    this.transmitFifo.splice(
      0,
      this.transmitFifo.length,
      ...state.transmitFifo.map((value) => value & 0xff)
    );
    this.thrInterruptPending = state.thrInterruptPending;
    this.interruptActive = state.interruptActive;
  }

  public portRanges(): readonly Uart16550PortRange[] {
    return [
      {
        start: this.basePort,
        end: this.basePort + 7,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      }
    ];
  }

  private readReceiveBuffer(): number {
    const value = this.receiveFifo.shift() ?? 0;
    if (this.receiveFifo.length === 0) this.lineStatus &= ~LSR_DATA_READY;
    this.updateInterrupt();
    return value;
  }

  private readInterruptIdentification(): number {
    const result = this.interruptIdentification();
    if ((result & 0x0f) === IIR_THR_EMPTY) this.thrInterruptPending = false;
    this.updateInterrupt();
    return result;
  }

  private readLineStatus(): number {
    const result = this.lineStatus;
    this.lineStatus &= ~LSR_ERROR;
    this.updateInterrupt();
    return result;
  }

  private readModemStatus(): number {
    const result = this.modemStatus;
    this.modemStatus &= ~MSR_DELTA_MASK;
    this.updateInterrupt();
    return result;
  }

  private writeFifoControl(value: number): void {
    this.fifoControl = value & (FCR_ENABLE | FCR_TRIGGER_MASK);
    if (value & FCR_CLEAR_RECEIVE) {
      this.receiveFifo.length = 0;
      this.lineStatus &= ~LSR_DATA_READY;
    }
    if (value & FCR_CLEAR_TRANSMIT) {
      this.transmitFifo.length = 0;
      this.lineStatus |= LSR_THR_EMPTY | LSR_TRANSMITTER_EMPTY;
      this.thrInterruptPending = true;
    }
  }

  private writeModemControl(value: number): void {
    this.modemControl = value & 0x1f;
    if (this.modemControl & MCR_LOOPBACK) {
      this.setModemInputs({
        cts: Boolean(this.modemControl & 0x02),
        dsr: Boolean(this.modemControl & 0x01),
        ri: Boolean(this.modemControl & 0x04),
        rlsd: Boolean(this.modemControl & 0x08)
      });
    }
  }

  private writeTransmitHolding(value: number): void {
    if (this.transmitFifo.length < this.transmitCapacity()) this.transmitFifo.push(value);
    this.lineStatus &= ~(LSR_THR_EMPTY | LSR_TRANSMITTER_EMPTY);
    this.thrInterruptPending = false;
    const transmitted = this.transmitFifo.shift();
    if (transmitted !== undefined) {
      if (this.modemControl & MCR_LOOPBACK) this.receiveByte(transmitted);
      else this.onTransmit(transmitted);
    }
    this.lineStatus |= LSR_THR_EMPTY | LSR_TRANSMITTER_EMPTY;
    this.thrInterruptPending = true;
  }

  private interruptIdentification(): number {
    let cause = IIR_NO_INTERRUPT;
    if (this.lineStatus & LSR_ERROR && this.interruptEnable & IER_LINE_STATUS)
      cause = IIR_LINE_STATUS;
    else if (this.receiveInterruptPending()) cause = IIR_RECEIVED_DATA;
    else if (this.thrInterruptPending && this.interruptEnable & IER_THR_EMPTY)
      cause = IIR_THR_EMPTY;
    else if (this.modemStatus & MSR_DELTA_MASK && this.interruptEnable & IER_MODEM_STATUS)
      cause = IIR_MODEM_STATUS;
    return cause | (this.fifoEnabled() ? 0xc0 : 0);
  }

  private receiveInterruptPending(): boolean {
    return (
      Boolean(this.interruptEnable & IER_RECEIVED_DATA) &&
      this.receiveFifo.length >= this.receiveTrigger()
    );
  }

  private updateInterrupt(): void {
    const active = (this.interruptIdentification() & IIR_NO_INTERRUPT) === 0;
    if (active === this.interruptActive) return;
    this.interruptActive = active;
    this.onInterrupt(active);
  }

  private fifoEnabled(): boolean {
    return Boolean(this.fifoControl & FCR_ENABLE);
  }
  private receiveCapacity(): number {
    return this.fifoEnabled() ? this.fifoCapacity : 1;
  }
  private transmitCapacity(): number {
    return this.fifoEnabled() ? this.fifoCapacity : 1;
  }

  private receiveTrigger(): number {
    if (!this.fifoEnabled()) return 1;
    switch ((this.fifoControl & FCR_TRIGGER_MASK) >>> 6) {
      case 0:
        return 1;
      case 1:
        return 4;
      case 2:
        return 8;
      default:
        return 14;
    }
  }

  private requireBytePort(port: number, width: PortWidth): void {
    if (width !== 8) throw new RangeError(`UART supports 8-bit I/O only, received ${width}-bit`);
    if (!Number.isInteger(port) || port < this.basePort || port > this.basePort + 7)
      throw new RangeError(`UART port is not mapped: 0x${port.toString(16)}`);
  }
}
