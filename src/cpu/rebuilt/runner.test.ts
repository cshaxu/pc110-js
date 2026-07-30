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

  it("admits an IF-enabled external interrupt and wakes HLT through the IVT", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    memory.writeUint8(0x20, 0x40);
    memory.writeUint8(0x21, 0);
    memory.writeUint8(0x22, 0);
    memory.writeUint8(0x23, 0);
    const runner = new RebuiltCpuRunner(memory);
    runner.state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    runner.state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false });
    runner.state.writeEip(0x10);
    runner.state.registers.write16(4, 0x100);
    runner.state.halt();
    expect(runner.serviceExternalInterrupt(8)).toBe(false);
    runner.state.flags.set(0x200);
    expect(runner.serviceExternalInterrupt(8)).toBe(true);
    expect(runner.state.snapshot()).toMatchObject({
      eip: 0x40,
      halted: false,
      registers: { esp: 0xfa }
    });
    expect(memory.readUint8(0xfa)).toBe(0x10);
    expect(runner.state.flags.read() & 0x200).toBe(0);
  });

  it("delivers a non-maskable interrupt through the IVT despite IF being clear", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    memory.writeUint8(0x08, 0x40);
    memory.writeUint8(0x09, 0x00);
    memory.writeUint8(0x0a, 0x00);
    memory.writeUint8(0x0b, 0x00);
    const runner = new RebuiltCpuRunner(memory);
    runner.state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    runner.state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false });
    runner.state.writeEip(0x10);
    runner.state.registers.write16(4, 0x100);
    runner.state.halt();

    expect(runner.serviceNonMaskableInterrupt()).toBe(true);
    expect(runner.state.snapshot()).toMatchObject({ eip: 0x40, halted: false });
  });

  it.each([
    {
      name: "POP SS",
      bytes: [0x17, 0x90],
      setup: (memory: PhysicalMemory, runner: RebuiltCpuRunner) => {
        runner.state.registers.write16(4, 0x100);
        memory.writeUint8(0x100, 0);
        memory.writeUint8(0x101, 0);
      }
    },
    {
      name: "MOV SS",
      bytes: [0x8e, 0xd0, 0x90],
      setup: (_memory: PhysicalMemory, runner: RebuiltCpuRunner) => {
        runner.state.registers.write16(0, 0);
      }
    },
    { name: "STI", bytes: [0xfb, 0x90], setup: () => undefined }
  ])("defers a maskable interrupt across the instruction after $name", ({ bytes, setup }) => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    bytes.forEach((value, index) => memory.writeUint8(index, value));
    memory.writeUint8(0x20, 0x40);
    memory.writeUint8(0x21, 0);
    memory.writeUint8(0x22, 0);
    memory.writeUint8(0x23, 0);
    const runner = new RebuiltCpuRunner(memory);
    runner.state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    runner.state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false });
    runner.state.writeEip(0);
    runner.state.registers.write16(4, 0x100);
    runner.state.flags.set(0x200);
    setup(memory, runner);
    runner.step();
    expect(runner.state.maskableInterruptsInhibited()).toBe(true);
    expect(runner.serviceExternalInterrupt(8)).toBe(false);
    runner.step();
    expect(runner.state.maskableInterruptsInhibited()).toBe(false);
    expect(runner.serviceExternalInterrupt(8)).toBe(true);
    expect(runner.state.readEip()).toBe(0x40);
  });
});
