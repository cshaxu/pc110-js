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

  it("routes the reset-vector far JMP through the rebuilt dispatcher", () => {
    const firmware = new Uint8Array(0x10000);
    firmware.set([0xea, 0x00, 0x00, 0x00, 0xf0], 0xfff0);
    firmware[0] = 0x90;
    const memory = new PhysicalMemory({ ramBytes: 0xa0000, a20Enabled: true });
    memory.mapRom(createRomImage("rebuilt-test-bios", firmware), 0x000f0000, [0xffff0000]);
    const runner = new RebuiltCpuRunner(memory);
    runner.run(2);
    expect(runner.state.snapshot()).toMatchObject({
      eip: 1,
      segments: { cs: { selector: 0xf000, base: 0x000f0000 } }
    });
  });

  it("routes immediate port output through a supplied project I/O boundary", () => {
    const writes: Array<[number, number, number]> = [];
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    memory.writeUint8(0, 0xe6);
    memory.writeUint8(1, 0x84);
    const runner = new RebuiltCpuRunner(memory, {
      read: () => 0,
      write: (port, value, width) => writes.push([port, value, width])
    });
    runner.state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    runner.state.writeEip(0);
    runner.state.registers.write8(0, 0x5a);
    runner.step();
    expect(writes).toEqual([[0x84, 0x5a, 8]]);
  });
});
