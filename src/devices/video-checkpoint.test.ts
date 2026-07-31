import { describe, expect, it } from "vitest";
import { CgaCompatibility } from "./cga-compatibility.js";
import { MdaCompatibility } from "./mda-compatibility.js";
import { VgaAttributeController } from "./vga-attribute-controller.js";
import { VgaCrtc, VGA_CRTC_INDEX_PORT } from "./vga-crtc.js";
import { VgaDac, VGA_DAC_DATA_PORT, VGA_DAC_WRITE_ADDRESS_PORT } from "./vga-dac.js";
import { VgaFeatureControl, VGA_FEATURE_CONTROL_COLOR_PORT } from "./vga-feature-control.js";
import { VgaGraphicsController } from "./vga-graphics-controller.js";
import { VgaMemory } from "./vga-memory.js";
import { VgaMiscellaneousOutput, VGA_MISC_OUTPUT_WRITE_PORT } from "./vga-miscellaneous-output.js";
import { VgaSequencer } from "./vga-sequencer.js";

describe("project-native video checkpoint state", () => {
  it("restores registers, compatibility timing, planes, latches, and palette progress", () => {
    const sequencer = new VgaSequencer();
    const graphics = new VgaGraphicsController();
    const memory = new VgaMemory(sequencer, graphics);
    const attribute = new VgaAttributeController();
    const crtc = new VgaCrtc();
    const dac = new VgaDac();
    const feature = new VgaFeatureControl();
    const miscellaneous = new VgaMiscellaneousOutput();
    const mda = new MdaCompatibility();
    const cga = new CgaCompatibility();

    sequencer.write(0x3c4, 0x02, 8);
    sequencer.write(0x3c5, 0x0f, 8);
    graphics.write(0x3ce, 0x08, 8);
    graphics.write(0x3cf, 0xff, 8);
    memory.writeUint8(0, 0xa5);
    memory.readUint8(0);
    attribute.write(0x3c0, 0x20, 8);
    attribute.write(0x3c0, 0x12, 8);
    crtc.write(VGA_CRTC_INDEX_PORT, 0x0d, 8);
    crtc.write(VGA_CRTC_INDEX_PORT + 1, 0x34, 8);
    dac.write(VGA_DAC_WRITE_ADDRESS_PORT, 2, 8);
    dac.write(VGA_DAC_DATA_PORT, 0x2d, 8);
    feature.write(VGA_FEATURE_CONTROL_COLOR_PORT, 3, 8);
    miscellaneous.write(VGA_MISC_OUTPUT_WRITE_PORT, 0x67, 8);
    mda.advance(1_000);
    cga.advance(1_000);
    const checkpoint = {
      sequencer: sequencer.capture(),
      graphics: graphics.capture(),
      memory: memory.capture(),
      attribute: attribute.capture(),
      crtc: crtc.capture(),
      dac: dac.capture(),
      feature: feature.capture(),
      miscellaneous: miscellaneous.capture(),
      mda: mda.capture(),
      cga: cga.capture()
    };

    memory.reset();
    dac.reset();
    mda.reset();
    cga.reset();
    attribute.reset();
    crtc.reset();
    feature.reset();
    miscellaneous.reset();
    sequencer.reset();
    graphics.reset();
    sequencer.restore(checkpoint.sequencer);
    graphics.restore(checkpoint.graphics);
    memory.restore(checkpoint.memory);
    attribute.restore(checkpoint.attribute);
    crtc.restore(checkpoint.crtc);
    dac.restore(checkpoint.dac);
    feature.restore(checkpoint.feature);
    miscellaneous.restore(checkpoint.miscellaneous);
    mda.restore(checkpoint.mda);
    cga.restore(checkpoint.cga);

    expect(memory.capture()).toEqual(checkpoint.memory);
    expect(dac.capture()).toEqual(checkpoint.dac);
    expect(mda.capture()).toEqual(checkpoint.mda);
    expect(cga.capture()).toEqual(checkpoint.cga);
    expect(attribute.capture()).toEqual(checkpoint.attribute);
    expect(crtc.capture()).toEqual(checkpoint.crtc);
    expect(feature.capture()).toEqual(checkpoint.feature);
    expect(miscellaneous.capture()).toEqual(checkpoint.miscellaneous);
  });
});
