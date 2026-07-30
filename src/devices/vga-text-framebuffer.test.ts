import { describe, expect, it } from "vitest";
import { VgaCrtc } from "./vga-crtc.js";
import { VgaDac } from "./vga-dac.js";
import { VgaGraphicsController } from "./vga-graphics-controller.js";
import { VgaMemory } from "./vga-memory.js";
import { VgaSequencer } from "./vga-sequencer.js";
import { VgaTextFramebuffer } from "./vga-text-framebuffer.js";

describe("VGA text framebuffer", () => {
  it("derives cells from native planes, display start, and DAC palette", () => {
    const sequencer = new VgaSequencer();
    const graphics = new VgaGraphicsController();
    const memory = new VgaMemory(sequencer, graphics);
    const crtc = new VgaCrtc();
    const dac = new VgaDac();
    const framebuffer = new VgaTextFramebuffer(memory, crtc, dac);
    sequencer.write(0x3c4, 2, 8);
    graphics.write(0x3ce, 8, 8);
    graphics.write(0x3cf, 0xff, 8);
    dac.write(0x3c8, 0x0f, 8);
    dac.write(0x3c9, 1, 8);
    dac.write(0x3c9, 2, 8);
    dac.write(0x3c9, 3, 8);
    sequencer.write(0x3c5, 0x01, 8);
    memory.writeUint8(1, 0x41);
    sequencer.write(0x3c5, 0x02, 8);
    memory.writeUint8(1, 0x1f);
    crtc.write(0x3d4, 0x0d, 8);
    crtc.write(0x3d5, 1, 8);
    expect(framebuffer.cell(0, 0)).toEqual({
      character: 0x41,
      foreground: [1, 2, 3],
      background: [0, 0, 0]
    });
  });
});
