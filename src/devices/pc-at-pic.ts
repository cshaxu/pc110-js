import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";
import { Pic8259, type Pic8259Snapshot } from "./pic8259.js";

export const MASTER_PIC_COMMAND_PORT = 0x20;
export const MASTER_PIC_DATA_PORT = 0x21;
export const SLAVE_PIC_COMMAND_PORT = 0xa0;
export const SLAVE_PIC_DATA_PORT = 0xa1;

export interface PcAtPicSnapshot {
  readonly master: Pic8259Snapshot;
  readonly slave: Pic8259Snapshot;
}

export interface PcAtPicPortRange {
  readonly start: number;
  readonly end: number;
  readonly read: (port: number, width: PortWidth) => number;
  readonly write: (port: number, value: number, width: PortWidth) => void;
}

/**
 * Composes the two PC/AT 8259A controllers. CPU interrupt admission remains
 * outside this device so the cascade can be tested without CPU coupling.
 */
export class PcAtPic {
  public readonly master = new Pic8259();
  public readonly slave = new Pic8259();

  public reset(): void {
    this.master.reset();
    this.slave.reset();
  }

  public read(port: number, width: PortWidth): number {
    this.requireByteWidth(width);
    switch (port) {
      case MASTER_PIC_COMMAND_PORT:
        return this.master.readCommand();
      case MASTER_PIC_DATA_PORT:
        return this.master.readData();
      case SLAVE_PIC_COMMAND_PORT:
        return this.slave.readCommand();
      case SLAVE_PIC_DATA_PORT:
        return this.slave.readData();
      default:
        throw new RangeError(`PC/AT PIC port is not mapped: 0x${port.toString(16)}`);
    }
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requireByteWidth(width);
    switch (port) {
      case MASTER_PIC_COMMAND_PORT:
        this.master.writeCommand(value);
        return;
      case MASTER_PIC_DATA_PORT:
        this.master.writeData(value);
        return;
      case SLAVE_PIC_COMMAND_PORT:
        this.slave.writeCommand(value);
        return;
      case SLAVE_PIC_DATA_PORT:
        this.slave.writeData(value);
        return;
      default:
        throw new RangeError(`PC/AT PIC port is not mapped: 0x${port.toString(16)}`);
    }
  }

  public raiseIrq(irq: number): void {
    if (!Number.isInteger(irq) || irq < 0 || irq > 15)
      throw new RangeError(`PC/AT IRQ is outside 0-15: ${irq}`);
    if (irq < 8) {
      this.master.raise(irq);
      return;
    }
    this.slave.raise(irq - 8);
    this.synchronizeCascade();
  }

  public acknowledge(): number | undefined {
    this.synchronizeCascade();
    const masterVector = this.master.acknowledge();
    if (masterVector === undefined) return undefined;
    if ((masterVector & 7) !== 2) return masterVector;
    return this.slave.acknowledge() ?? masterVector;
  }

  public snapshot(): PcAtPicSnapshot {
    return { master: this.master.snapshot(), slave: this.slave.snapshot() };
  }

  public portRanges(): readonly PcAtPicPortRange[] {
    return [
      this.portRange(MASTER_PIC_COMMAND_PORT),
      this.portRange(MASTER_PIC_DATA_PORT),
      this.portRange(SLAVE_PIC_COMMAND_PORT),
      this.portRange(SLAVE_PIC_DATA_PORT)
    ];
  }

  private synchronizeCascade(): void {
    if (this.slave.pendingLine() !== undefined) this.master.raise(2);
  }

  private requireByteWidth(width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(`PC/AT PIC supports 8-bit I/O only, received ${width}-bit`);
  }

  private portRange(port: number): PcAtPicPortRange {
    return {
      start: port,
      end: port,
      read: (mappedPort, width) => this.read(mappedPort, width),
      write: (mappedPort, value, width) => this.write(mappedPort, value, width)
    };
  }
}
