import type { PortWidth } from "../cpu/rebuilt/io/port-bus.js";
import { VgaDac } from "./vga-dac.js";

export const VGA_INPUT_STATUS_0_PORT = 0x3c2;
const VGA_STATUS0_SWITCH_SENSE = 0x10;
const VGA_DAC_SWITCH_SENSE_VALUE = 0x2d;

/** VGA Input Status 0 for the selected color-monitor DAC probe. */
export class VgaInputStatus0 {
  public constructor(private readonly dac: VgaDac) {}

  public read(port: number, width: PortWidth): number {
    this.requireByteWidth(width);
    if (port !== VGA_INPUT_STATUS_0_PORT)
      throw new RangeError(`VGA Input Status 0 port is not mapped: 0x${port.toString(16)}`);
    return this.switchSense() ? VGA_STATUS0_SWITCH_SENSE : 0;
  }

  public portRanges() {
    return [
      {
        start: VGA_INPUT_STATUS_0_PORT,
        end: VGA_INPUT_STATUS_0_PORT,
        read: (port: number, width: PortWidth) => this.read(port, width)
      }
    ];
  }

  private switchSense(): boolean {
    return !this.dac.color(0).some((component) => component === VGA_DAC_SWITCH_SENSE_VALUE);
  }

  private requireByteWidth(width: PortWidth): void {
    if (width !== 8)
      throw new RangeError(`VGA Input Status 0 supports 8-bit I/O only, received ${width}-bit`);
  }
}
