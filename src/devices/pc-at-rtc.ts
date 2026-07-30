import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";
import {
  RtcCmos,
  type RtcAdvanceResult,
  type RtcCmosOptions,
  type RtcCmosSnapshot
} from "./rtc-cmos.js";

export const RTC_CMOS_ADDRESS_PORT = 0x70;
export const RTC_CMOS_DATA_PORT = 0x71;

export interface PcAtRtcPortRange {
  readonly start: number;
  readonly end: number;
  readonly read: (port: number, width: PortWidth) => number;
  readonly write: (port: number, value: number, width: PortWidth) => void;
}

/**
 * PC/AT RTC/CMOS port composition. The NMI-mask bit is retained as a signal
 * for T3 S5; this device neither generates nor suppresses CPU NMIs.
 */
export class PcAtRtc {
  public readonly rtc: RtcCmos;
  private address = 0;

  public constructor(
    options: RtcCmosOptions = {},
    private readonly raiseIrq?: (irq: number) => void
  ) {
    this.rtc = new RtcCmos(options);
  }

  public reset(): void {
    this.address = 0;
    this.rtc.reset();
  }

  public read(port: number, width: PortWidth): number {
    this.requireByteWidth(width);
    if (port === RTC_CMOS_ADDRESS_PORT) return this.address;
    if (port === RTC_CMOS_DATA_PORT) return this.rtc.read(this.address);
    throw new RangeError(`PC/AT RTC port is not mapped: 0x${port.toString(16)}`);
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requireByteWidth(width);
    if (port === RTC_CMOS_ADDRESS_PORT) {
      this.address = value & 0xff;
      return;
    }
    if (port === RTC_CMOS_DATA_PORT) return this.rtc.write(this.address, value);
    throw new RangeError(`PC/AT RTC port is not mapped: 0x${port.toString(16)}`);
  }

  public advance(ticks: number): RtcAdvanceResult {
    const result = this.rtc.advance(ticks);
    if (result.interruptRequested) this.raiseIrq?.(8);
    return result;
  }

  public nmiDisabled(): boolean {
    return Boolean(this.address & 0x80);
  }

  public snapshot(): RtcCmosSnapshot {
    return this.rtc.snapshot();
  }

  public portRanges(): readonly PcAtRtcPortRange[] {
    return [
      {
        start: RTC_CMOS_ADDRESS_PORT,
        end: RTC_CMOS_DATA_PORT,
        read: (port, width) => this.read(port, width),
        write: (port, value, width) => this.write(port, value, width)
      }
    ];
  }

  private requireByteWidth(width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(`PC/AT RTC supports 8-bit I/O only, received ${width}-bit`);
  }
}
