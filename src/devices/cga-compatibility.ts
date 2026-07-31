import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";

export const CGA_CRTC_INDEX_PORT = 0x3d4;
export const CGA_CRTC_DATA_PORT = 0x3d5;
export const CGA_MODE_PORT = 0x3d8;
export const CGA_COLOR_PORT = 0x3d9;
export const CGA_STATUS_PORT = 0x3da;

const CGA_STATUS_RETRACE = 0x01;
const CGA_STATUS_VERTICAL_RETRACE = 0x08;
const VGA_STATUS_DIAGNOSTIC = 0x30;
const VGA_DEFAULT_CPU_CYCLES_PER_SECOND = 16_000_000;
const VGA_HORIZONTAL_PERIODS_PER_SECOND = 31_500;
const VGA_HORIZONTAL_PERIODS_PER_FRAME = 400;
const VGA_HORIZONTAL_ACTIVE_PERCENT = 85;
const VGA_VERTICAL_ACTIVE_PERCENT = 83;

export interface CgaCompatibilityOptions {
  readonly cpuCyclesPerSecond?: number;
}

export interface CgaCompatibilitySnapshot {
  readonly crtcIndex: number;
  readonly crtcData: readonly number[];
  readonly mode: number;
  readonly color: number;
  readonly retrace: boolean;
  readonly verticalRetrace: boolean;
  readonly diagnosticStatus: number;
}

export interface CgaCompatibilityState extends CgaCompatibilitySnapshot {
  readonly frameCycles: number;
}

export interface CgaCompatibilityPortRange {
  readonly start: number;
  readonly end: number;
  readonly read: (port: number, width: PortWidth) => number;
  readonly write?: (port: number, value: number, width: PortWidth) => void;
}

/**
 * VGA color compatibility state. It retains legacy CRTC, mode, color, and
 * Input Status 1 behavior required by firmware probes without rendering output.
 */
export class CgaCompatibility {
  private readonly crtcData = new Uint8Array(32);
  private readonly cyclesPerHorizontalPeriod: number;
  private readonly cyclesPerHorizontalActive: number;
  private readonly cyclesPerVerticalActive: number;
  private readonly cyclesPerVerticalPeriod: number;
  private crtcIndex = 0;
  private mode = 0;
  private color = 0;
  private retrace = true;
  private verticalRetrace = true;
  private diagnosticStatus = 0;
  private frameCycles = 0;

  public constructor(
    private readonly onStatusRead?: () => void,
    private readonly ownsCrtcPorts = true,
    options: CgaCompatibilityOptions = {}
  ) {
    const cpuCyclesPerSecond = options.cpuCyclesPerSecond ?? VGA_DEFAULT_CPU_CYCLES_PER_SECOND;
    if (!Number.isSafeInteger(cpuCyclesPerSecond) || cpuCyclesPerSecond <= 0)
      throw new RangeError("VGA CPU clock must be a positive safe integer");
    this.cyclesPerHorizontalPeriod = Math.trunc(
      cpuCyclesPerSecond / VGA_HORIZONTAL_PERIODS_PER_SECOND
    );
    this.cyclesPerHorizontalActive = Math.trunc(
      (this.cyclesPerHorizontalPeriod * VGA_HORIZONTAL_ACTIVE_PERCENT) / 100
    );
    this.cyclesPerVerticalActive =
      this.cyclesPerHorizontalPeriod * VGA_HORIZONTAL_PERIODS_PER_FRAME;
    this.cyclesPerVerticalPeriod = Math.trunc(
      (this.cyclesPerVerticalActive * 100) / VGA_VERTICAL_ACTIVE_PERCENT
    );
  }

  public reset(): void {
    this.crtcData.fill(0);
    this.crtcIndex = 0;
    this.mode = 0;
    this.color = 0;
    this.retrace = true;
    this.verticalRetrace = true;
    this.diagnosticStatus = 0;
    this.frameCycles = 0;
  }

  /** Advances VGA Input Status 1 from guest CPU cycles, never host time. */
  public advance(cycles: number): void {
    if (!Number.isSafeInteger(cycles) || cycles < 0)
      throw new RangeError("VGA cycle charge must be a non-negative safe integer");
    this.frameCycles = (this.frameCycles + cycles) % this.cyclesPerVerticalPeriod;
    const verticalBlankCycles = this.cyclesPerVerticalPeriod - this.cyclesPerVerticalActive;
    this.verticalRetrace = this.frameCycles < verticalBlankCycles;
    const activeFrameCycles = this.frameCycles - verticalBlankCycles;
    this.retrace =
      this.verticalRetrace ||
      activeFrameCycles % this.cyclesPerHorizontalPeriod > this.cyclesPerHorizontalActive;
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
      case CGA_STATUS_PORT: {
        this.onStatusRead?.();
        const retraceStatus =
          (this.retrace ? CGA_STATUS_RETRACE : 0) |
          (this.verticalRetrace ? CGA_STATUS_VERTICAL_RETRACE : 0);
        this.diagnosticStatus =
          (this.diagnosticStatus & VGA_STATUS_DIAGNOSTIC) ^ VGA_STATUS_DIAGNOSTIC;
        return retraceStatus | this.diagnosticStatus;
      }
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
      verticalRetrace: this.verticalRetrace,
      diagnosticStatus: this.diagnosticStatus
    };
  }
  public capture(): CgaCompatibilityState {
    return { ...this.snapshot(), frameCycles: this.frameCycles };
  }
  public restore(state: CgaCompatibilityState): void {
    if (
      state.crtcData.length !== this.crtcData.length ||
      !Number.isInteger(state.crtcIndex) ||
      !Number.isInteger(state.frameCycles) ||
      state.frameCycles < 0 ||
      state.frameCycles >= this.cyclesPerVerticalPeriod
    )
      throw new RangeError("CGA checkpoint state is invalid");
    this.crtcIndex = state.crtcIndex & 0x1f;
    this.crtcData.set(state.crtcData);
    this.mode = state.mode & 0xff;
    this.color = state.color & 0xff;
    this.retrace = state.retrace;
    this.verticalRetrace = state.verticalRetrace;
    this.diagnosticStatus = state.diagnosticStatus & VGA_STATUS_DIAGNOSTIC;
    this.frameCycles = state.frameCycles;
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
