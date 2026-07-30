import { describe, expect, it } from "vitest";
import { PhysicalMemory } from "../memory/physical-memory.js";
import { RebuiltPcAt386Core } from "../machine/rebuilt-pc-at-386-core.js";
import { VgaGraphicsController } from "./vga-graphics-controller.js";
import { VGA_MEMORY_SIZE, VGA_MEMORY_START, VgaMemory } from "./vga-memory.js";
import { VgaSequencer } from "./vga-sequencer.js";

function writeRegister(
  controller: VgaGraphicsController | VgaSequencer,
  indexPort: number,
  dataPort: number,
  index: number,
  value: number
): void {
  controller.write(indexPort, index, 8);
  controller.write(dataPort, value, 8);
}

function createMemory(): {
  memory: VgaMemory;
  graphics: VgaGraphicsController;
  sequencer: VgaSequencer;
} {
  const graphics = new VgaGraphicsController();
  const sequencer = new VgaSequencer();
  return { memory: new VgaMemory(sequencer, graphics), graphics, sequencer };
}

describe("VGA memory", () => {
  it("maps the selected B8000 text window and honors sequencer plane masks", () => {
    const { memory, graphics, sequencer } = createMemory();
    writeRegister(graphics, 0x3ce, 0x3cf, 6, 0x0c);
    writeRegister(graphics, 0x3ce, 0x3cf, 8, 0xff);
    writeRegister(sequencer, 0x3c4, 0x3c5, 2, 0x03);

    memory.writeUint8(0x18000, 0x41);
    expect(memory.readPlane(0, 0)).toBe(0x41);
    expect(memory.readPlane(1, 0)).toBe(0x41);
    expect(memory.readPlane(2, 0)).toBe(0);
    expect(memory.readUint8(0x0000)).toBe(0xff);
  });

  it("loads latches on reads and applies modes zero through three", () => {
    const { memory, graphics, sequencer } = createMemory();
    writeRegister(graphics, 0x3ce, 0x3cf, 8, 0xff);
    writeRegister(sequencer, 0x3c4, 0x3c5, 2, 0x0f);

    memory.writeUint8(0, 0x12);
    expect(memory.readUint8(0)).toBe(0x12);
    expect(memory.latchSnapshot()).toEqual([0x12, 0x12, 0x12, 0x12]);

    writeRegister(graphics, 0x3ce, 0x3cf, 5, 0x01);
    memory.writeUint8(1, 0);
    expect(memory.readPlane(0, 1)).toBe(0x12);

    writeRegister(graphics, 0x3ce, 0x3cf, 5, 0x02);
    memory.writeUint8(2, 0x05);
    expect(memory.readPlane(0, 2)).toBe(0xff);
    expect(memory.readPlane(1, 2)).toBe(0x00);
    expect(memory.readPlane(2, 2)).toBe(0xff);

    writeRegister(graphics, 0x3ce, 0x3cf, 0, 0x09);
    writeRegister(graphics, 0x3ce, 0x3cf, 5, 0x03);
    writeRegister(graphics, 0x3ce, 0x3cf, 8, 0x0f);
    memory.writeUint8(3, 0xff);
    expect(memory.readPlane(0, 3)).toBe(0x1f);
    expect(memory.readPlane(1, 3)).toBe(0x10);
    expect(memory.readPlane(3, 3)).toBe(0x1f);
  });

  it("supports read mode one and chain-four address selection", () => {
    const { memory, graphics, sequencer } = createMemory();
    writeRegister(graphics, 0x3ce, 0x3cf, 8, 0xff);
    writeRegister(sequencer, 0x3c4, 0x3c5, 2, 0x0f);
    memory.writeUint8(0, 0x80);
    writeRegister(graphics, 0x3ce, 0x3cf, 2, 0x0f);
    writeRegister(graphics, 0x3ce, 0x3cf, 7, 0x0f);
    writeRegister(graphics, 0x3ce, 0x3cf, 5, 0x08);
    expect(memory.readUint8(0)).toBe(0x80);

    writeRegister(graphics, 0x3ce, 0x3cf, 5, 0x00);
    writeRegister(sequencer, 0x3c4, 0x3c5, 4, 0x08);
    memory.writeUint8(6, 0x5a);
    expect(memory.readPlane(2, 1)).toBe(0x5a);
  });

  it("composes the native aperture into physical memory and resets its planes", () => {
    const physical = new PhysicalMemory({ ramBytes: 0xa0000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(physical);
    core.graphicsController.write(0x3ce, 6, 8);
    core.graphicsController.write(0x3cf, 0x0c, 8);
    core.graphicsController.write(0x3ce, 8, 8);
    core.graphicsController.write(0x3cf, 0xff, 8);
    core.sequencer.write(0x3c4, 2, 8);
    core.sequencer.write(0x3c5, 0x01, 8);
    physical.writeUint8(VGA_MEMORY_START + 0x18000, 0x41);
    expect(core.vgaMemory.readPlane(0, 0)).toBe(0x41);
    expect(() => physical.readUint8(VGA_MEMORY_START + VGA_MEMORY_SIZE)).toThrow();

    core.reset();
    expect(core.vgaMemory.readPlane(0, 0)).toBe(0);
  });
});
