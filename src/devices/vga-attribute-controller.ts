import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";

export const VGA_ATTRIBUTE_INDEX_DATA_PORT = 0x3c0;
export const VGA_ATTRIBUTE_DATA_PORT = 0x3c1;

const ATTRIBUTE_INDEX_MASK = 0x1f;
const ATTRIBUTE_PALETTE_ENABLE = 0x20;
const ATTRIBUTE_REGISTER_COUNT = 0x20;

export interface VgaAttributeControllerSnapshot {
  readonly index: number;
  readonly paletteEnabled: boolean;
  readonly expectsData: boolean;
  readonly data: readonly number[];
}

export interface VgaAttributeControllerPortRange {
  readonly start: number;
  readonly end: number;
  readonly read: (port: number, width: PortWidth) => number;
  readonly write?: (port: number, value: number, width: PortWidth) => void;
}

/**
 * VGA attribute-controller register state. Reading status one must call
 * resetAddressDataFlipFlop() before the next index/data write sequence.
 */
export class VgaAttributeController {
  private readonly data = new Uint8Array(ATTRIBUTE_REGISTER_COUNT);
  private index = 0;
  private paletteEnabled = false;
  private expectsData = false;

  public reset(): void {
    this.data.fill(0);
    this.index = 0;
    this.paletteEnabled = false;
    this.expectsData = false;
  }

  public resetAddressDataFlipFlop(): void {
    this.expectsData = false;
  }

  public read(port: number, width: PortWidth): number {
    this.requireByteWidth(width);
    if (port === VGA_ATTRIBUTE_INDEX_DATA_PORT)
      return this.index | (this.paletteEnabled ? ATTRIBUTE_PALETTE_ENABLE : 0);
    if (port === VGA_ATTRIBUTE_DATA_PORT) return this.data[this.index]!;
    throw new RangeError(`VGA attribute-controller port is not mapped: 0x${port.toString(16)}`);
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requireByteWidth(width);
    if (port !== VGA_ATTRIBUTE_INDEX_DATA_PORT)
      throw new RangeError(`VGA attribute-controller port is not writable: 0x${port.toString(16)}`);
    const data = this.byte(value);
    if (!this.expectsData) {
      this.index = data & ATTRIBUTE_INDEX_MASK;
      this.paletteEnabled = (data & ATTRIBUTE_PALETTE_ENABLE) !== 0;
      this.expectsData = true;
      return;
    }
    this.expectsData = false;
    if (this.index >= 0x10 || !this.paletteEnabled)
      this.data[this.index] = data & this.registerMask(this.index);
  }

  public snapshot(): VgaAttributeControllerSnapshot {
    return {
      index: this.index,
      paletteEnabled: this.paletteEnabled,
      expectsData: this.expectsData,
      data: Array.from(this.data)
    };
  }

  public capture(): VgaAttributeControllerSnapshot {
    return this.snapshot();
  }

  public restore(state: VgaAttributeControllerSnapshot): void {
    if (state.data.length !== ATTRIBUTE_REGISTER_COUNT || !Number.isInteger(state.index))
      throw new RangeError("VGA attribute checkpoint state is invalid");
    this.index = state.index & ATTRIBUTE_INDEX_MASK;
    this.paletteEnabled = state.paletteEnabled;
    this.expectsData = state.expectsData;
    this.data.set(state.data);
  }

  public portRanges(): readonly VgaAttributeControllerPortRange[] {
    return [
      {
        start: VGA_ATTRIBUTE_INDEX_DATA_PORT,
        end: VGA_ATTRIBUTE_DATA_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      }
    ];
  }

  private registerMask(index: number): number {
    if (index <= 0x0f || index === 0x11) return 0x3f;
    if (index === 0x10) return 0xef;
    if (index === 0x12) return 0x3f;
    if (index === 0x13 || index === 0x14) return 0x0f;
    return 0xff;
  }

  private requireByteWidth(width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(
        `VGA attribute controller supports 8-bit I/O only, received ${width}-bit`
      );
  }

  private byte(value: number): number {
    if (!Number.isInteger(value))
      throw new RangeError(`VGA attribute-controller byte is not an integer: ${value}`);
    return value & 0xff;
  }
}
