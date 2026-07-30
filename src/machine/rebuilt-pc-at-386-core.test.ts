import { describe, expect, it } from "vitest";
import { createRomImage } from "../firmware/rom-image.js";
import { PhysicalMemory } from "../memory/physical-memory.js";
import { RTC_TICKS_PER_SECOND, RtcCmosRegister } from "../devices/rtc-cmos.js";
import { RebuiltPcAt386Core, type RebuiltMachineTraceEvent } from "./rebuilt-pc-at-386-core.js";

describe("RebuiltPcAt386Core", () => {
  it("composes rebuilt CPU stepping, port dispatch, and trace hooks", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    memory.writeUint8(0, 0xe6);
    memory.writeUint8(1, 0x84);
    memory.writeUint8(2, 0xf4);
    const trace: RebuiltMachineTraceEvent[] = [];
    const writes: Array<[number, number, number]> = [];
    const core = new RebuiltPcAt386Core(memory, (event) => trace.push(event));
    core.registerPorts({
      start: 0x84,
      end: 0x84,
      write: (port, value, width) => writes.push([port, value, width])
    });
    core.runner.state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    core.runner.state.writeEip(0);
    core.runner.state.registers.write8(0, 0x5a);

    expect(core.run(5)).toEqual({ executed: 2, halted: true });
    expect(writes).toEqual([[0x84, 0x5a, 8]]);
    expect(trace.map((event) => event.kind)).toEqual([
      "port",
      "instruction",
      "instruction",
      "stop"
    ]);
    expect(trace.at(-1)).toMatchObject({ kind: "stop", reason: "halted", executed: 2 });
  });

  it("resets the rebuilt CPU and emits a reset trace", () => {
    const firmware = new Uint8Array(0x10000);
    firmware[0xfff0] = 0x90;
    const memory = new PhysicalMemory({ ramBytes: 0xa0000, a20Enabled: true });
    memory.mapRom(createRomImage("rebuilt-test-bios", firmware), 0xf0000, [0xffff0000]);
    const trace: RebuiltMachineTraceEvent[] = [];
    const core = new RebuiltPcAt386Core(memory, (event) => trace.push(event));
    core.runner.state.writeEip(0);

    core.reset();
    expect(core.runner.state.readEip()).toBe(0xfff0);
    expect(trace).toMatchObject([{ kind: "reset", state: { eip: 0xfff0 } }]);
  });

  it("records unmapped ports as a deterministic stop boundary", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    memory.writeUint8(0, 0xe6);
    memory.writeUint8(1, 0x84);
    const trace: RebuiltMachineTraceEvent[] = [];
    const core = new RebuiltPcAt386Core(memory, (event) => trace.push(event));
    core.runner.state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    core.runner.state.writeEip(0);

    expect(() => core.run(1)).toThrow("Unmapped I/O write port: 0x84");
    expect(trace).toMatchObject([
      { kind: "stop", reason: "error", executed: 0, error: "Unmapped I/O write port: 0x84" }
    ]);
  });

  it("delivers a pending PIC IRQ only when the rebuilt CPU accepts INTR", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    memory.writeUint8(0x84, 0x40);
    const trace: RebuiltMachineTraceEvent[] = [];
    const core = new RebuiltPcAt386Core(memory, (event) => trace.push(event));
    core.runner.state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    core.runner.state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false });
    core.runner.state.writeEip(0x10);
    core.runner.state.registers.write16(4, 0x100);
    core.runner.state.halt();
    core.ports.write(0x20, 0x11, 8);
    core.ports.write(0x21, 0x20, 8);
    core.ports.write(0x21, 0x04, 8);
    core.ports.write(0x21, 0x01, 8);
    core.pic.raiseIrq(1);

    core.step();
    expect(core.runner.state.snapshot()).toMatchObject({ eip: 0x10, halted: true });
    expect(core.pic.pendingVector()).toBe(0x21);

    core.runner.state.flags.set(0x200);
    core.step();
    expect(core.runner.state.snapshot()).toMatchObject({ eip: 0x40, halted: false });
    expect(core.pic.snapshot().master).toMatchObject({ inService: 0x02, request: 0 });
    expect(trace).toContainEqual({ kind: "interrupt", vector: 0x21 });
  });

  it("retains a pending PIC IRQ through the STI interrupt-inhibit boundary", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    memory.writeUint8(0x10, 0xfb);
    memory.writeUint8(0x11, 0x90);
    memory.writeUint8(0x84, 0x40);
    const core = new RebuiltPcAt386Core(memory);
    core.runner.state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    core.runner.state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false });
    core.runner.state.writeEip(0x10);
    core.runner.state.registers.write16(4, 0x100);
    core.ports.write(0x20, 0x11, 8);
    core.ports.write(0x21, 0x20, 8);
    core.ports.write(0x21, 0x04, 8);
    core.ports.write(0x21, 0x01, 8);
    core.pic.raiseIrq(1);

    core.step();
    expect(core.runner.state.maskableInterruptsInhibited()).toBe(true);
    core.step();
    expect(core.runner.state.readEip()).toBe(0x12);
    expect(core.pic.pendingVector()).toBe(0x21);
    core.step();
    expect(core.runner.state.readEip()).toBe(0x40);
  });

  it("routes an explicit PIT counter-0 tick through the native PIC and CPU", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    memory.writeUint8(0x80, 0x40);
    const core = new RebuiltPcAt386Core(memory);
    core.runner.state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    core.runner.state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false });
    core.runner.state.writeEip(0x10);
    core.runner.state.registers.write16(4, 0x100);
    core.runner.state.flags.set(0x200);
    core.ports.write(0x20, 0x11, 8);
    core.ports.write(0x21, 0x20, 8);
    core.ports.write(0x21, 0x04, 8);
    core.ports.write(0x21, 0x01, 8);
    core.ports.write(0x43, 0x34, 8);
    core.ports.write(0x40, 2, 8);
    core.ports.write(0x40, 0, 8);

    core.advancePit(2);
    expect(core.pic.pendingVector()).toBeUndefined();
    core.advancePit(1);
    expect(core.pic.pendingVector()).toBe(0x20);
    core.step();
    expect(core.runner.state.readEip()).toBe(0x40);
  });

  it("registers native DMA ports and resets their project-owned state", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    core.ports.write(0x81, 0x4a, 8);
    core.dma.setHardwareRequest(2, true);
    expect(core.ports.read(0x81, 8)).toBe(0x4a);
    expect(core.dma.snapshot(2).requested).toBe(true);
    core.reset();
    expect(core.dma.snapshot(2)).toMatchObject({ page: 0, requested: false, masked: true });
  });

  it("routes explicit native RTC events through IRQ8 and preserves port state across reset", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    core.ports.write(0x70, RtcCmosRegister.StatusB, 8);
    core.ports.write(0x71, 0x42, 8);
    core.ports.write(0x70, RtcCmosRegister.StatusA, 8);
    core.ports.write(0x71, 0x26, 8);
    core.ports.write(0xa0, 0x11, 8);
    core.ports.write(0xa1, 0x28, 8);
    core.ports.write(0xa1, 0x02, 8);
    core.ports.write(0xa1, 0x01, 8);
    core.ports.write(0x20, 0x11, 8);
    core.ports.write(0x21, 0x20, 8);
    core.ports.write(0x21, 0x04, 8);
    core.ports.write(0x21, 0x01, 8);

    core.advanceRtc(RTC_TICKS_PER_SECOND);
    expect(core.pic.pendingVector()).toBe(0x28);
    core.reset();
    expect(core.rtc.snapshot()).toMatchObject({ statusC: 0, statusD: 0x80 });
  });

  it("registers native system port 0x61 and gates PIT counter 2", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    core.ports.write(0x61, 0x03, 8);
    expect(core.systemPort.snapshot()).toMatchObject({ timer2Gate: true, speakerData: true });
    expect(core.pit.snapshot(2).gate).toBe(true);
    core.reset();
    expect(core.systemPort.snapshot()).toMatchObject({ timer2Gate: false, speakerData: false });
  });

  it("delivers a requested NMI only when the RTC address mask permits it", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    memory.writeUint8(0x08, 0x40);
    const trace: RebuiltMachineTraceEvent[] = [];
    const core = new RebuiltPcAt386Core(memory, (event) => trace.push(event));
    core.runner.state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    core.runner.state.writeSegment("ss", { selector: 0, base: 0, limit: 0xffff, default32: false });
    core.runner.state.writeEip(0x10);
    core.runner.state.registers.write16(4, 0x100);
    core.runner.state.halt();

    core.ports.write(0x70, 0x80, 8);
    expect(core.requestNmi()).toBe(false);
    core.ports.write(0x70, 0, 8);
    expect(core.requestNmi()).toBe(true);
    core.step();
    expect(core.runner.state.snapshot()).toMatchObject({ eip: 0x40, halted: false });
    expect(trace).toContainEqual({ kind: "interrupt", vector: 2 });
  });

  it("routes the narrow 8042 output-port signals to physical A20 and CPU reset", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x200000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    core.runner.state.writeEip(0x1234);
    core.writeKeyboardOutputPort(0x01);
    expect(memory.isA20Enabled()).toBe(false);
    expect(core.runner.state.readEip()).toBe(0x1234);
    core.writeKeyboardOutputPort(0x02);
    expect(memory.isA20Enabled()).toBe(true);
    expect(core.runner.state.readEip()).toBe(0xfff0);
  });

  it("maps the selected 8042 ports, routes raw keyboard bytes to IRQ1, and applies output-port effects", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x200000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    core.ports.write(0x20, 0x11, 8);
    core.ports.write(0x21, 0x20, 8);
    core.ports.write(0x21, 0x04, 8);
    core.ports.write(0x21, 0x01, 8);
    core.ports.write(0x64, 0x60, 8);
    core.ports.write(0x60, 0x01, 8);

    expect(core.receiveKeyboardByte(0x1c)).toBe(true);
    expect(core.pic.pendingVector()).toBe(0x21);
    expect(core.ports.read(0x60, 8)).toBe(0x1c);
    core.ports.write(0x64, 0xd1, 8);
    core.ports.write(0x60, 0x01, 8);
    expect(memory.isA20Enabled()).toBe(false);
    core.ports.write(0x64, 0xaa, 8);
    expect(core.ports.read(0x60, 8)).toBe(0x55);
    expect(memory.isA20Enabled()).toBe(true);
    expect(core.keyboardController.snapshot().keyboardEnabled).toBe(false);
    core.reset();
    expect(core.keyboardController.snapshot()).toMatchObject({
      outputBuffer: undefined,
      keyboardEnabled: false
    });
  });
});
