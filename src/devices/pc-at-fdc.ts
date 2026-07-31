import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";
import { Fdc765, type Fdc765Result, type Fdc765State } from "./fdc765.js";

export const FDC_DOR_PORT = 0x3f2;
export const FDC_MAIN_STATUS_PORT = 0x3f4;
export const FDC_DATA_PORT = 0x3f5;
export const FDC_CONTROL_PORT = 0x3f7;

export interface PcAtFdcPortRange {
  readonly start: number;
  readonly end: number;
  readonly read?: (port: number, width: PortWidth) => number;
  readonly write?: (port: number, value: number, width: PortWidth) => void;
}

export interface PcAtFdcState {
  readonly controller: Fdc765State;
}

/**
 * PC/AT FDC port adapter. It owns byte-wide port dispatch and signal routing;
 * raw media and DMA transfer ownership remain outside the controller core.
 */
export class PcAtFdc {
  public readonly controller = new Fdc765();

  public constructor(
    private readonly raiseIrq: (irq: number) => void,
    private readonly setDmaRequest: (active: boolean) => void
  ) {}

  public reset(): void {
    this.controller.reset();
    this.setDmaRequest(false);
  }

  public read(port: number, width: PortWidth): number {
    this.requireByteWidth(width);
    switch (port) {
      case FDC_MAIN_STATUS_PORT:
        return this.controller.readMainStatus();
      case FDC_DATA_PORT:
        return this.controller.readData();
      case FDC_CONTROL_PORT:
        return this.controller.readInput();
      default:
        throw new RangeError(`PC/AT FDC port is not readable: 0x${port.toString(16)}`);
    }
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requireByteWidth(width);
    let operation: Fdc765Result;
    switch (port) {
      case FDC_DOR_PORT:
        operation = this.controller.writeDor(value);
        break;
      case FDC_DATA_PORT:
        operation = this.controller.writeData(value);
        break;
      case FDC_CONTROL_PORT:
        operation = this.controller.writeControl(value);
        break;
      default:
        throw new RangeError(`PC/AT FDC port is not mapped: 0x${port.toString(16)}`);
    }
    this.apply(operation);
  }

  public completeDma(terminalCount: boolean): void {
    this.apply(this.controller.completeDma(terminalCount));
  }

  public capture(): PcAtFdcState {
    return { controller: this.controller.capture() };
  }

  public restore(state: PcAtFdcState): void {
    this.controller.restore(state.controller);
    this.setDmaRequest(this.controller.snapshot().phase === "execution");
  }

  public portRanges(): readonly PcAtFdcPortRange[] {
    return [
      {
        start: FDC_DOR_PORT,
        end: FDC_DOR_PORT,
        write: (port, value, width) => this.write(port, value, width)
      },
      {
        start: FDC_MAIN_STATUS_PORT,
        end: FDC_MAIN_STATUS_PORT,
        read: (port, width) => this.read(port, width)
      },
      {
        start: FDC_DATA_PORT,
        end: FDC_DATA_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      },
      {
        start: FDC_CONTROL_PORT,
        end: FDC_CONTROL_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      }
    ];
  }

  private apply(operation: Fdc765Result): void {
    if (!operation.accepted) return;
    this.setDmaRequest(this.controller.snapshot().phase === "execution");
    if (operation.irqRequested) this.raiseIrq(6);
  }

  private requireByteWidth(width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(`PC/AT FDC supports 8-bit I/O only, received ${width}-bit`);
  }
}
