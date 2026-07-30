import { describe, expect, it } from "vitest";
import { createRomImage } from "../../firmware/rom-image.js";
import { PhysicalMemory } from "../../memory/physical-memory.js";
import { RebuiltCpuRunner } from "./runner.js";

describe("RebuiltCpuRunner", () => {
  it("runs through the high reset-ROM alias without the legacy CPU", () => {
    const firmware = new Uint8Array(0x10000);
    firmware[0xfff0] = 0x90;
    firmware[0xfff1] = 0x90;
    const memory = new PhysicalMemory({ ramBytes: 0xa0000, a20Enabled: true });
    memory.mapRom(createRomImage("rebuilt-test-bios", firmware), 0x000f0000, [0xffff0000]);
    const runner = new RebuiltCpuRunner(memory);
    runner.run(2);
    expect(runner.state.readEip()).toBe(0xfff2);
  });
});
