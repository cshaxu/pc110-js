import { describe, expect, it } from "vitest";
import { createRomImage } from "../firmware/rom-image.js";
import { PhysicalMemory } from "../memory/physical-memory.js";
import { PcAt386Core } from "./pc-at-386-core.js";

describe("PC/AT 386 core", () => {
  it("runs from the high reset-ROM alias through project-owned machine boundaries", () => {
    const firmware = new Uint8Array(0x10000);
    firmware[0xfff0] = 0x90;
    firmware[0xfff1] = 0xf4;
    const memory = new PhysicalMemory({ ramBytes: 0xa0000, a20Enabled: true });
    memory.mapRom(createRomImage("test-bios", firmware), 0x000f0000, [0xffff0000]);
    const core = new PcAt386Core({ memory });

    expect(core.run(5)).toEqual({ executed: 2, halted: true });
    expect(core.cpu.snapshot().eip).toBe(0x0000fff2);

    core.resetCpu();
    expect(core.cpu.snapshot()).toMatchObject({ eip: 0x0000fff0, halted: false });
  });
});
