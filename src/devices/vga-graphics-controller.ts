import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";

export const VGA_GRAPHICS_INDEX_PORT = 0x3ce;
export const VGA_GRAPHICS_DATA_PORT = 0x3cf;

const GRAPHICS_REGISTER_COUNT = 9;

export interface VgaGraphicsControllerSnapshot {
  readonly index: number;
  readonly data: readonly number[];
}

export interface VgaGraphicsControllerPortRange {
  readonly start: number;
  readonly end: number;
  readonly read: (port: number, width: PortWidth) => number;
  readonly write?: (port: number, value: number, width: PortWidth) => void;
}

/**
 * VGA graphics-controller register state. Its selected read/write modes are
 * consumed by the separate project-native VGA memory device.
 */
export class VgaGraphicsController {
  private readonly data = new Uint8Array(GRAPHICS_REGISTER_COUNT);
  private index = 0;

  public reset(): void {
    this.data.fill(0);
    this.index = 0;
  }

  public read(port: number, width: PortWidth): number {
    this.requireByteWidth(width);
    if (port === VGA_GRAPHICS_INDEX_PORT) return this.index;
    if (port === VGA_GRAPHICS_DATA_PORT) return this.data[this.index]!;
    throw new RangeError(`VGA graphics-controller port is not mapped: 0x${port.toString(16)}`);
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requireByteWidth(width);
    const data = this.byte(value);
    if (port === VGA_GRAPHICS_INDEX_PORT) {
      this.index = data & 0x0f;
      return;
    }
    if (port === VGA_GRAPHICS_DATA_PORT) {
      if (this.index >= GRAPHICS_REGISTER_COUNT)
        throw new RangeError(
          `VGA graphics-controller index is not defined: 0x${this.index.toString(16)}`
        );
      this.data[this.index] = data & this.registerMask(this.index);
      return;
    }
    throw new RangeError(`VGA graphics-controller port is not writable: 0x${port.toString(16)}`);
  }

  public readRegister(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index >= GRAPHICS_REGISTER_COUNT)
      throw new RangeError(`VGA graphics-controller index is not defined: ${index}`);
    return this.data[index]!;
  }

  public snapshot(): VgaGraphicsControllerSnapshot {
    return { index: this.index, data: Array.from(this.data) };
  }

  public portRanges(): readonly VgaGraphicsControllerPortRange[] {
    return [
      {
        start: VGA_GRAPHICS_INDEX_PORT,
        end: VGA_GRAPHICS_DATA_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      }
    ];
  }

  private registerMask(index: number): number {
    switch (index) {
      case 0:
      case 1:
      case 2:
      case 7:
        return 0x0f;
      case 3:
        return 0x1f;
      case 4:
        return 0x03;
      case 5:
        return 0x1b;
      case 6:
        return 0x0f;
      case 8:
        return 0xff;
      default:
        throw new RangeError(`VGA graphics-controller index is not defined: ${index}`);
    }
  }

  private requireByteWidth(width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(
        `VGA graphics controller supports 8-bit I/O only, received ${width}-bit`
      );
  }

  private byte(value: number): number {
    if (!Number.isInteger(value))
      throw new RangeError(`VGA graphics-controller byte is not an integer: ${value}`);
    return value & 0xff;
  }
}
