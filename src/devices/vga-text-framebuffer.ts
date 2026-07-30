import { VgaCrtc } from "./vga-crtc.js";
import { VgaDac } from "./vga-dac.js";
import { VgaMemory } from "./vga-memory.js";

export interface VgaTextCell {
  readonly character: number;
  readonly foreground: readonly [number, number, number];
  readonly background: readonly [number, number, number];
}

/** Presentation-facing text cells derived only from native VGA hardware state. */
export class VgaTextFramebuffer {
  public constructor(
    private readonly memory: VgaMemory,
    private readonly crtc: VgaCrtc,
    private readonly dac: VgaDac
  ) {}

  public cell(column: number, row: number, columns = 80): VgaTextCell {
    if (
      !Number.isInteger(column) ||
      !Number.isInteger(row) ||
      !Number.isInteger(columns) ||
      column < 0 ||
      row < 0 ||
      columns <= 0
    )
      throw new RangeError("VGA text-cell coordinates must be non-negative integers");
    const address = (this.crtc.displayStartAddress() + row * columns + column) & 0xffff;
    const attribute = this.memory.readPlane(1, address);
    return {
      character: this.memory.readPlane(0, address),
      foreground: this.dac.color(attribute & 0x0f),
      background: this.dac.color((attribute >>> 4) & 0x07)
    };
  }
}
