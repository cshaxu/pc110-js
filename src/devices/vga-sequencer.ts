import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";

export const VGA_SEQUENCER_INDEX_PORT = 0x3c4;
export const VGA_SEQUENCER_DATA_PORT = 0x3c5;

const SEQUENCER_REGISTER_COUNT = 5;

export interface VgaSequencerSnapshot {
  readonly index: number;
  readonly data: readonly number[];
}

export interface VgaSequencerPortRange {
  readonly start: number;
  readonly end: number;
  readonly read: (port: number, width: PortWidth) => number;
  readonly write?: (port: number, value: number, width: PortWidth) => void;
}

/**
 * VGA sequencer register state. Memory-plane effects remain owned by the
 * later VGA memory implementation, which consumes this bank's map mode.
 */
export class VgaSequencer {
  private readonly data = new Uint8Array(SEQUENCER_REGISTER_COUNT);
  private index = 0;

  public reset(): void {
    this.data.fill(0);
    this.index = 0;
  }

  public read(port: number, width: PortWidth): number {
    this.requireByteWidth(width);
    if (port === VGA_SEQUENCER_INDEX_PORT) return this.index;
    if (port === VGA_SEQUENCER_DATA_PORT) return this.data[this.index]!;
    throw new RangeError(`VGA sequencer port is not mapped: 0x${port.toString(16)}`);
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requireByteWidth(width);
    const data = this.byte(value);
    if (port === VGA_SEQUENCER_INDEX_PORT) {
      this.index = data & 0x07;
      return;
    }
    if (port === VGA_SEQUENCER_DATA_PORT) {
      if (this.index >= SEQUENCER_REGISTER_COUNT)
        throw new RangeError(`VGA sequencer index is not defined: 0x${this.index.toString(16)}`);
      this.data[this.index] = data & this.registerMask(this.index);
      return;
    }
    throw new RangeError(`VGA sequencer port is not writable: 0x${port.toString(16)}`);
  }

  public snapshot(): VgaSequencerSnapshot {
    return { index: this.index, data: Array.from(this.data) };
  }

  public readRegister(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index >= SEQUENCER_REGISTER_COUNT)
      throw new RangeError(`VGA sequencer index is not defined: ${index}`);
    return this.data[index]!;
  }

  public portRanges(): readonly VgaSequencerPortRange[] {
    return [
      {
        start: VGA_SEQUENCER_INDEX_PORT,
        end: VGA_SEQUENCER_DATA_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      }
    ];
  }

  private registerMask(index: number): number {
    switch (index) {
      case 0:
        return 0x03;
      case 1:
        return 0x3f;
      case 2:
        return 0x0f;
      case 3:
        return 0x3f;
      case 4:
        return 0x0f;
      default:
        throw new RangeError(`VGA sequencer index is not defined: 0x${index.toString(16)}`);
    }
  }

  private requireByteWidth(width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(`VGA sequencer supports 8-bit I/O only, received ${width}-bit`);
  }

  private byte(value: number): number {
    if (!Number.isInteger(value))
      throw new RangeError(`VGA sequencer byte is not an integer: ${value}`);
    return value & 0xff;
  }
}
