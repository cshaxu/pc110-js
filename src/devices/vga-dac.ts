import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";

export const VGA_DAC_MASK_PORT = 0x3c6;
export const VGA_DAC_STATE_PORT = 0x3c7;
export const VGA_DAC_READ_ADDRESS_PORT = 0x3c7;
export const VGA_DAC_WRITE_ADDRESS_PORT = 0x3c8;
export const VGA_DAC_DATA_PORT = 0x3c9;

export class VgaDac {
  private readonly palette = new Uint8Array(256 * 3);
  private mask = 0xff;
  private address = 0;
  private component = 0;
  private readMode = false;

  public reset(): void {
    this.palette.fill(0);
    this.mask = 0xff;
    this.address = 0;
    this.component = 0;
    this.readMode = false;
  }
  public read(port: number, width: PortWidth): number {
    this.requireByteWidth(width);
    if (port === VGA_DAC_MASK_PORT) return this.mask;
    if (port === VGA_DAC_STATE_PORT) return this.readMode ? 0x03 : 0x00;
    if (port === VGA_DAC_WRITE_ADDRESS_PORT) return this.address;
    if (port === VGA_DAC_DATA_PORT) {
      const value = this.palette[this.address * 3 + this.component]!;
      this.advance();
      return value;
    }
    throw new RangeError(`VGA DAC port is not mapped: 0x${port.toString(16)}`);
  }
  public write(port: number, value: number, width: PortWidth): void {
    this.requireByteWidth(width);
    const byte = value & 0xff;
    if (port === VGA_DAC_MASK_PORT) {
      this.mask = byte;
      return;
    }
    if (port === VGA_DAC_READ_ADDRESS_PORT) {
      this.address = byte;
      this.component = 0;
      this.readMode = true;
      return;
    }
    if (port === VGA_DAC_WRITE_ADDRESS_PORT) {
      this.address = byte;
      this.component = 0;
      this.readMode = false;
      return;
    }
    if (port === VGA_DAC_DATA_PORT) {
      this.palette[this.address * 3 + this.component] = byte & 0x3f;
      this.advance();
      return;
    }
    throw new RangeError(`VGA DAC port is not writable: 0x${port.toString(16)}`);
  }
  public color(index: number): readonly [number, number, number] {
    if (!Number.isInteger(index) || index < 0 || index > 255)
      throw new RangeError(`VGA DAC index is out of range: ${index}`);
    const offset = index * 3;
    return [this.palette[offset]!, this.palette[offset + 1]!, this.palette[offset + 2]!];
  }
  public portRanges() {
    return [
      {
        start: VGA_DAC_MASK_PORT,
        end: VGA_DAC_DATA_PORT,
        read: (port: number, width: PortWidth) => this.read(port, width),
        write: (port: number, value: number, width: PortWidth) => this.write(port, value, width)
      }
    ];
  }
  private advance(): void {
    this.component += 1;
    if (this.component === 3) {
      this.component = 0;
      this.address = (this.address + 1) & 0xff;
    }
  }
  private requireByteWidth(width: PortWidth): void {
    if (width !== 8) throw new RangeError(`VGA DAC supports 8-bit I/O only, received ${width}-bit`);
  }
}
