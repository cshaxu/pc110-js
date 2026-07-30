import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";

export const CGA_CRTC_INDEX_PORT = 0x3d4;
export const CGA_CRTC_DATA_PORT = 0x3d5;
export const CGA_MODE_PORT = 0x3d8;
export const CGA_COLOR_PORT = 0x3d9;
export const CGA_STATUS_PORT = 0x3da;

const CGA_STATUS_RETRACE = 0x01;
const CGA_STATUS_VERTICAL_RETRACE = 0x08;

export interface CgaCompatibilitySnapshot {
  readonly crtcIndex: number;
  readonly crtcData: readonly number[];
  readonly mode: number;
  readonly color: number;
  readonly retrace: boolean;
  readonly verticalRetrace: boolean;
}

export interface CgaCompatibilityPortRange {
  readonly start: number;
  readonly end: number;
  readonly read: (port: number, width: PortWidth) => number;
  readonly write?: (port: number, value: number, width: PortWidth) => void;
}

/**
 * VGA-visible CGA compatibility state. It retains CRTC, mode, color, and
 * status behavior required by firmware probes without rendering CGA output.
 */
export class CgaCompatibility {
  private readonly crtcData = new Uint8Array(32);
  private crtcIndex = 0;
  private mode = 0;
  private color = 0;
  private retrace = false;
  private verticalRetrace = false;

  public constructor(
    private readonly onStatusRead?: () => void,
    private readonly ownsCrtcPorts = true
  ) {}

  public reset(): void {
    this.crtcData.fill(0);
    this.crtcIndex = 0;
    this.mode = 0;
    this.color = 0;
    this.retrace = false;
    this.verticalRetrace = false;
  }

  public advance(): void {
    this.retrace = !this.retrace;
    if (!this.retrace) this.verticalRetrace = !this.verticalRetrace;
  }

  public read(port: number, width: PortWidth): number {
    if (width === 16 && this.isWordPairPort(port))
      return this.read(port, 8) | (this.read(port + 1, 8) << 8);
    this.requireByteWidth(width);
    switch (port) {
      case CGA_CRTC_INDEX_PORT:
        return this.crtcIndex;
      case CGA_CRTC_DATA_PORT:
        return this.crtcData[this.crtcIndex]!;
      case CGA_MODE_PORT:
        return this.mode;
      case CGA_COLOR_PORT:
        return this.color;
      case CGA_STATUS_PORT:
        this.onStatusRead?.();
        return (
          (this.retrace ? CGA_STATUS_RETRACE : 0) |
          (this.verticalRetrace ? CGA_STATUS_VERTICAL_RETRACE : 0)
        );
      default:
        throw new RangeError(`CGA compatibility port is not mapped: 0x${port.toString(16)}`);
    }
  }

  public write(port: number, value: number, width: PortWidth): void {
    if (width === 16 && this.isWordPairPort(port)) {
      this.write(port, value, 8);
      this.write(port + 1, value >>> 8, 8);
      return;
    }
    this.requireByteWidth(width);
    const data = this.byte(value);
    switch (port) {
      case CGA_CRTC_INDEX_PORT:
        this.crtcIndex = data & 0x1f;
        return;
      case CGA_CRTC_DATA_PORT:
        this.crtcData[this.crtcIndex] = data;
        return;
      case CGA_MODE_PORT:
        this.mode = data;
        return;
      case CGA_COLOR_PORT:
        this.color = data;
        return;
      default:
        throw new RangeError(`CGA compatibility port is not writable: 0x${port.toString(16)}`);
    }
  }

  public snapshot(): CgaCompatibilitySnapshot {
    return {
      crtcIndex: this.crtcIndex,
      crtcData: Array.from(this.crtcData),
      mode: this.mode,
      color: this.color,
      retrace: this.retrace,
      verticalRetrace: this.verticalRetrace
    };
  }

  public portRanges(): readonly CgaCompatibilityPortRange[] {
    const ranges: CgaCompatibilityPortRange[] = [];
    if (this.ownsCrtcPorts) {
      ranges.push({
        start: CGA_CRTC_INDEX_PORT,
        end: CGA_CRTC_DATA_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      });
    }
    ranges.push(
      {
        start: CGA_MODE_PORT,
        end: CGA_COLOR_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      },
      {
        start: CGA_STATUS_PORT,
        end: CGA_STATUS_PORT,
        read: (port, width) => this.read(port, width)
      }
    );
    return ranges;
  }

  private requireByteWidth(width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(`CGA compatibility supports 8-bit I/O only, received ${width}-bit`);
  }

  private isWordPairPort(port: number): boolean {
    return port === CGA_CRTC_INDEX_PORT || port === CGA_MODE_PORT;
  }

  private byte(value: number): number {
    if (!Number.isInteger(value)) throw new RangeError(`CGA byte is not an integer: ${value}`);
    return value & 0xff;
  }
}
