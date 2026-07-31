import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";

export const VGA_CRTC_INDEX_PORT = 0x3d4;
export const VGA_CRTC_DATA_PORT = 0x3d5;
const REGISTER_COUNT = 0x19;

export interface VgaCrtcSnapshot {
  readonly index: number;
  readonly data: readonly number[];
}

export interface VgaCrtcPortRange {
  readonly start: number;
  readonly end: number;
  readonly read: (port: number, width: PortWidth) => number;
  readonly write?: (port: number, value: number, width: PortWidth) => void;
}

/** Native VGA CRTC indexed state, including display-start and cursor registers. */
export class VgaCrtc {
  private readonly data = new Uint8Array(REGISTER_COUNT);
  private index = 0;

  public reset(): void {
    this.data.fill(0);
    this.index = 0;
  }
  public read(port: number, width: PortWidth): number {
    if (width === 16 && port === VGA_CRTC_INDEX_PORT)
      return this.read(VGA_CRTC_INDEX_PORT, 8) | (this.read(VGA_CRTC_DATA_PORT, 8) << 8);
    this.requireByteWidth(width);
    if (port === VGA_CRTC_INDEX_PORT) return this.index;
    if (port === VGA_CRTC_DATA_PORT) return this.data[this.index]!;
    throw new RangeError(`VGA CRTC port is not mapped: 0x${port.toString(16)}`);
  }
  public write(port: number, value: number, width: PortWidth): void {
    if (width === 16 && port === VGA_CRTC_INDEX_PORT) {
      this.write(VGA_CRTC_INDEX_PORT, value, 8);
      this.write(VGA_CRTC_DATA_PORT, value >>> 8, 8);
      return;
    }
    this.requireByteWidth(width);
    if (port === VGA_CRTC_INDEX_PORT) {
      this.index = value & 0x1f;
      return;
    }
    if (port === VGA_CRTC_DATA_PORT) {
      if (this.index >= REGISTER_COUNT)
        throw new RangeError(`VGA CRTC index is not defined: 0x${this.index.toString(16)}`);
      this.data[this.index] = value & this.mask(this.index);
      return;
    }
    throw new RangeError(`VGA CRTC port is not writable: 0x${port.toString(16)}`);
  }
  public readRegister(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index >= REGISTER_COUNT)
      throw new RangeError(`VGA CRTC index is not defined: ${index}`);
    return this.data[index]!;
  }
  public displayStartAddress(): number {
    return (this.data[0x0c]! << 8) | this.data[0x0d]!;
  }
  public cursorAddress(): number {
    return (this.data[0x0e]! << 8) | this.data[0x0f]!;
  }
  public snapshot(): VgaCrtcSnapshot {
    return { index: this.index, data: Array.from(this.data) };
  }
  public capture(): VgaCrtcSnapshot {
    return this.snapshot();
  }
  public restore(state: VgaCrtcSnapshot): void {
    if (state.data.length !== REGISTER_COUNT || !Number.isInteger(state.index))
      throw new RangeError("VGA CRTC checkpoint state is invalid");
    this.index = state.index & 0x1f;
    this.data.set(state.data);
  }
  public portRanges(): readonly VgaCrtcPortRange[] {
    return [
      {
        start: VGA_CRTC_INDEX_PORT,
        end: VGA_CRTC_DATA_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      }
    ];
  }
  private mask(index: number): number {
    return [
      0xff, 0xff, 0xff, 0x1f, 0xff, 0x1f, 0xff, 0xff, 0xff, 0xff, 0x7f, 0x1f, 0xff, 0xff, 0xff,
      0xff, 0xff, 0xff, 0xff, 0xff, 0x7f, 0xff, 0xff, 0xff, 0xff
    ][index]!;
  }
  private requireByteWidth(width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(`VGA CRTC supports 8-bit I/O only, received ${width}-bit`);
  }
}
