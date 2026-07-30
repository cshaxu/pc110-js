import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";

export const MDA_CRTC_FIRST_PORT = 0x3b0;
export const MDA_CRTC_LAST_PORT = 0x3b7;
export const MDA_MODE_PORT = 0x3b8;
export const MDA_STATUS_PORT = 0x3ba;

const MDA_STATUS_HDRIVE = 0x01;
const MDA_STATUS_BWVIDEO = 0x08;

export interface MdaCompatibilitySnapshot {
  readonly crtcIndex: number;
  readonly crtcData: readonly number[];
  readonly mode: number;
  readonly horizontalRetrace: boolean;
}

export interface MdaCompatibilityPortRange {
  readonly start: number;
  readonly end: number;
  readonly read: (port: number, width: PortWidth) => number;
  readonly write?: (port: number, value: number, width: PortWidth) => void;
}

/**
 * VGA-visible MDA compatibility state. It retains the complete MDA CRTC port
 * family required by firmware probes without claiming a separate display card.
 */
export class MdaCompatibility {
  private readonly crtcData = new Uint8Array(32);
  private crtcIndex = 0;
  private mode = 0;
  private horizontalRetrace = false;

  public reset(): void {
    this.crtcData.fill(0);
    this.crtcIndex = 0;
    this.mode = 0;
    this.horizontalRetrace = false;
  }

  public advance(): void {
    this.horizontalRetrace = !this.horizontalRetrace;
  }

  public read(port: number, width: PortWidth): number {
    if (width === 16 && this.isCrtcIndexPort(port))
      return this.read(port, 8) | (this.read(port + 1, 8) << 8);
    this.requireByteWidth(width);
    if (port >= MDA_CRTC_FIRST_PORT && port <= MDA_CRTC_LAST_PORT)
      return (port & 1) === 0 ? this.crtcIndex : this.crtcData[this.crtcIndex]!;
    if (port === MDA_MODE_PORT) return this.mode;
    if (port === MDA_STATUS_PORT)
      return MDA_STATUS_BWVIDEO | (this.horizontalRetrace ? MDA_STATUS_HDRIVE : 0);
    throw new RangeError(`MDA compatibility port is not mapped: 0x${port.toString(16)}`);
  }

  public write(port: number, value: number, width: PortWidth): void {
    if (width === 16 && this.isCrtcIndexPort(port)) {
      this.write(port, value, 8);
      this.write(port + 1, value >>> 8, 8);
      return;
    }
    this.requireByteWidth(width);
    const data = this.byte(value);
    if (port >= MDA_CRTC_FIRST_PORT && port <= MDA_CRTC_LAST_PORT) {
      if ((port & 1) === 0) this.crtcIndex = data & 0x1f;
      else this.crtcData[this.crtcIndex] = data;
      return;
    }
    if (port === MDA_MODE_PORT) {
      this.mode = data;
      return;
    }
    throw new RangeError(`MDA compatibility port is not writable: 0x${port.toString(16)}`);
  }

  public snapshot(): MdaCompatibilitySnapshot {
    return {
      crtcIndex: this.crtcIndex,
      crtcData: Array.from(this.crtcData),
      mode: this.mode,
      horizontalRetrace: this.horizontalRetrace
    };
  }

  public portRanges(): readonly MdaCompatibilityPortRange[] {
    return [
      {
        start: MDA_CRTC_FIRST_PORT,
        end: MDA_CRTC_LAST_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      },
      {
        start: MDA_MODE_PORT,
        end: MDA_MODE_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      },
      {
        start: MDA_STATUS_PORT,
        end: MDA_STATUS_PORT,
        read: (port, width) => this.read(port, width)
      }
    ];
  }

  private requireByteWidth(width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(`MDA compatibility supports 8-bit I/O only, received ${width}-bit`);
  }

  private isCrtcIndexPort(port: number): boolean {
    return port >= MDA_CRTC_FIRST_PORT && port <= MDA_CRTC_LAST_PORT && (port & 1) === 0;
  }

  private byte(value: number): number {
    if (!Number.isInteger(value)) throw new RangeError(`MDA byte is not an integer: ${value}`);
    return value & 0xff;
  }
}
