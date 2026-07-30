import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";
export const VGA_MISC_OUTPUT_WRITE_PORT = 0x3c2;
export const VGA_MISC_OUTPUT_READ_PORT = 0x3cc;
export class VgaMiscellaneousOutput {
  private value = 0;
  public reset(): void {
    this.value = 0;
  }
  public read(port: number, width: PortWidth): number {
    this.requireByteWidth(width);
    if (port === VGA_MISC_OUTPUT_READ_PORT) return this.value;
    throw new RangeError(`VGA miscellaneous-output port is not mapped: 0x${port.toString(16)}`);
  }
  public write(port: number, value: number, width: PortWidth): void {
    this.requireByteWidth(width);
    if (port === VGA_MISC_OUTPUT_WRITE_PORT) {
      this.value = value & 0xff;
      return;
    }
    throw new RangeError(`VGA miscellaneous-output port is not writable: 0x${port.toString(16)}`);
  }
  public portRanges() {
    return [
      {
        start: VGA_MISC_OUTPUT_WRITE_PORT,
        end: VGA_MISC_OUTPUT_WRITE_PORT,
        write: (port: number, value: number, width: PortWidth) => this.write(port, value, width)
      },
      {
        start: VGA_MISC_OUTPUT_READ_PORT,
        end: VGA_MISC_OUTPUT_READ_PORT,
        read: (port: number, width: PortWidth) => this.read(port, width)
      }
    ];
  }
  private requireByteWidth(width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(
        `VGA miscellaneous output supports 8-bit I/O only, received ${width}-bit`
      );
  }
}
