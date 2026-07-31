import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";

export const VGA_FEATURE_CONTROL_MONO_PORT = 0x3ba;
export const VGA_FEATURE_CONTROL_COLOR_PORT = 0x3da;
export const VGA_FEATURE_CONTROL_READ_PORT = 0x3ca;
const VGA_FEATURE_CONTROL_MASK = 0x03;

export interface VgaFeatureControlState {
  readonly value: number;
}

/** VGA Feature Control register with independent color and monochrome write aliases. */
export class VgaFeatureControl {
  private value = 0;

  public reset(): void {
    this.value = 0;
  }

  public read(port: number, width: PortWidth): number {
    this.requireByteWidth(width);
    if (port !== VGA_FEATURE_CONTROL_READ_PORT)
      throw new RangeError(`VGA Feature Control read port is not mapped: 0x${port.toString(16)}`);
    return this.value;
  }

  public write(port: number, value: number, width: PortWidth): void {
    this.requireByteWidth(width);
    if (port !== VGA_FEATURE_CONTROL_MONO_PORT && port !== VGA_FEATURE_CONTROL_COLOR_PORT)
      throw new RangeError(`VGA Feature Control write port is not mapped: 0x${port.toString(16)}`);
    this.value = value & VGA_FEATURE_CONTROL_MASK;
  }
  public capture(): VgaFeatureControlState {
    return { value: this.value };
  }
  public restore(state: VgaFeatureControlState): void {
    if (!Number.isInteger(state.value))
      throw new RangeError("VGA feature checkpoint state is invalid");
    this.value = state.value & VGA_FEATURE_CONTROL_MASK;
  }

  public portRanges() {
    return [
      {
        start: VGA_FEATURE_CONTROL_MONO_PORT,
        end: VGA_FEATURE_CONTROL_MONO_PORT,
        write: (port: number, value: number, width: PortWidth) => this.write(port, value, width)
      },
      {
        start: VGA_FEATURE_CONTROL_COLOR_PORT,
        end: VGA_FEATURE_CONTROL_COLOR_PORT,
        write: (port: number, value: number, width: PortWidth) => this.write(port, value, width)
      },
      {
        start: VGA_FEATURE_CONTROL_READ_PORT,
        end: VGA_FEATURE_CONTROL_READ_PORT,
        read: (port: number, width: PortWidth) => this.read(port, width)
      }
    ];
  }

  private requireByteWidth(width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(`VGA Feature Control supports 8-bit I/O only, received ${width}-bit`);
  }
}
