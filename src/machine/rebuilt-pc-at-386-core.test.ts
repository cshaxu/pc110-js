import { describe, expect, it } from "vitest";
import { createRomImage } from "../firmware/rom-image.js";
import { PhysicalMemory } from "../memory/physical-memory.js";
import { RTC_TICKS_PER_SECOND, RtcCmosRegister } from "../devices/rtc-cmos.js";
import { FloppyDrive } from "../devices/floppy-drive.js";
import { FixedDrive } from "../devices/fixed-drive.js";
import { RebuiltPcAt386Core, type RebuiltMachineTraceEvent } from "./rebuilt-pc-at-386-core.js";

describe("RebuiltPcAt386Core", () => {
  it("runs rebuilt instructions without an optional trace hook", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    memory.writeUint8(0, 0x90);
    memory.writeUint8(1, 0xf4);
    const core = new RebuiltPcAt386Core(memory);
    core.runner.state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    core.runner.state.writeEip(0);

    expect(core.run(5)).toEqual({ executed: 2, halted: true });
  });

  it("composes COM1 with the native IRQ4 path", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    core.ports.write(0x3f9, 0x01, 8);
    core.com1.receiveByte(0x5a);
    expect(core.pic.snapshot().master.request).toBe(0x10);
    expect(core.ports.read(0x3fa, 8)).toBe(0x04);
    expect(core.ports.read(0x3f8, 8)).toBe(0x5a);
  });

  it("composes COM2 with its native IRQ3 path", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    core.ports.write(0x2f9, 0x01, 8);
    core.com2.receiveByte(0x5a);
    expect(core.pic.snapshot().master.request).toBe(0x08);
    expect(core.ports.read(0x2fa, 8)).toBe(0x04);
    expect(core.ports.read(0x2f8, 8)).toBe(0x5a);
  });

  it("composes selected LPT1 at 0x378 with the native IRQ7 path", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    core.ports.write(0x37a, 0x10, 8);
    core.lpt1.setStatus(0x8f);
    expect(core.pic.snapshot().master.request).toBe(0x80);
    expect(core.ports.read(0x379, 8)).toBe(0x8f);
  });

  it("composes the primary AT fixed-disk controller with native IRQ14", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    const drive = new FixedDrive({ cylinders: 1, heads: 1, sectorsPerTrack: 1, bytesPerSector: 4 });
    drive.attach(new Uint8Array(4));
    core.hdc.attachDrive(0, drive);
    core.ports.write(0x1f7, 0x10, 8);
    expect(core.pic.snapshot()).toMatchObject({
      slave: { request: 0x40 }
    });
    expect(core.ports.read(0x1f7, 8)).toBe(0x50);
  });

  it("selects floating unpopulated I/O only when the machine profile requests it", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory, undefined, { unpopulatedIo: "floating" });
    expect(core.ports.read(0x3bc, 8)).toBe(0xff);
    expect(() => core.ports.write(0x3bc, 0, 8)).not.toThrow();
  });

  it("composes rebuilt CPU stepping, port dispatch, and trace hooks", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    memory.writeUint8(0, 0xe6);
    memory.writeUint8(1, 0xee);
    memory.writeUint8(2, 0xf4);
    const trace: RebuiltMachineTraceEvent[] = [];
    const writes: Array<[number, number, number]> = [];
    const core = new RebuiltPcAt386Core(memory, (event) => trace.push(event));
    core.registerPorts({
      start: 0xee,
      end: 0xee,
      write: (port, value, width) => writes.push([port, value, width])
    });
    core.runner.state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    core.runner.state.writeEip(0);
    core.runner.state.registers.write8(0, 0x5a);

    expect(core.run(5)).toEqual({ executed: 2, halted: true });
    expect(writes).toEqual([[0xee, 0x5a, 8]]);
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
    memory.writeUint8(1, 0xee);
    const trace: RebuiltMachineTraceEvent[] = [];
    const core = new RebuiltPcAt386Core(memory, (event) => trace.push(event));
    core.runner.state.writeSegment("cs", { selector: 0, base: 0, limit: 0xffff, default32: false });
    core.runner.state.writeEip(0);

    expect(() => core.run(1)).toThrow("Unmapped I/O write port: 0xee");
    expect(trace).toMatchObject([
      { kind: "stop", reason: "error", executed: 0, error: "Unmapped I/O write port: 0xee" }
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

  it("registers the native FPU control lines without an x87 execution engine", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    core.ports.write(0xf0, 0, 8);
    core.ports.write(0xf1, 0, 8);
    expect(core.fpuControl.snapshot()).toEqual({ clearCount: 1, resetCount: 1 });
    core.reset();
    expect(core.fpuControl.snapshot()).toEqual({ clearCount: 0, resetCount: 0 });
  });

  it("enables the secondary PIT only for the selected DeskPro configuration", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const generic = new RebuiltPcAt386Core(memory);
    expect(() => generic.ports.write(0x4b, 0x34, 8)).toThrow("Unmapped I/O write");

    const deskPro = new RebuiltPcAt386Core(
      new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true }),
      undefined,
      { deskProSecondaryPit: true }
    );
    deskPro.ports.write(0x4b, 0x34, 8);
    deskPro.ports.write(0x48, 2, 8);
    deskPro.ports.write(0x48, 0, 8);
    deskPro.advancePit(3);
    expect(deskPro.deskProSecondaryPit?.snapshot(0)).toMatchObject({ output: true });
  });

  it("moves a real raw floppy sector through native FDC DMA2 and requests IRQ6", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x4000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    const drive = new FloppyDrive({
      cylinders: 1,
      heads: 1,
      sectorsPerTrack: 1,
      bytesPerSector: 128
    });
    drive.attach(Uint8Array.from({ length: 128 }, (_, index) => index ^ 0xa5));
    core.fdc.controller.attachDrive(0, drive);
    core.ports.write(0x0c, 0, 8);
    core.ports.write(0x04, 0, 8);
    core.ports.write(0x04, 0x02, 8);
    core.ports.write(0x05, 0x7f, 8);
    core.ports.write(0x05, 0, 8);
    core.ports.write(0x81, 0, 8);
    core.ports.write(0x0a, 0x02, 8);
    core.ports.write(0x0b, 0x46, 8);
    core.ports.write(0xdc, 0, 8);
    core.ports.write(0x3f2, 0x0c, 8);
    for (let count = 0; count < 4; count += 1) {
      core.ports.write(0x3f5, 0x08, 8);
      core.ports.read(0x3f5, 8);
      core.ports.read(0x3f5, 8);
    }
    for (const byte of [0x06, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00])
      core.ports.write(0x3f5, byte, 8);

    expect(core.dma.snapshot(2).requested).toBe(true);
    expect(core.advanceFdcDma(128)).toBe(128);
    expect(Array.from({ length: 4 }, (_, index) => memory.readUint8(0x200 + index))).toEqual([
      0xa5, 0xa4, 0xa7, 0xa6
    ]);
    expect(core.fdc.controller.snapshot()).toMatchObject({ phase: "result", dmaBytesPending: 0 });
    expect(core.pic.master.snapshot().request & 0x40).toBe(0x40);
  });

  it("registers retained MDA compatibility state for selected VGA firmware probes", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    core.ports.write(0x3b8, 0x29, 8);
    core.ports.write(0x3b4, 0x0e, 8);
    core.ports.write(0x3b5, 0x11, 8);
    expect(core.ports.read(0x3b8, 8)).toBe(0x29);
    expect(core.ports.read(0x3b5, 8)).toBe(0x11);
    core.reset();
    expect(core.mdaCompatibility.snapshot()).toMatchObject({ mode: 0, crtcIndex: 0 });
  });

  it("registers retained CGA compatibility state for selected VGA firmware probes", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    core.ports.write(0x3d8, 0x29, 8);
    core.ports.write(0x3d9, 0x1e, 8);
    core.ports.write(0x3d4, 0x0f, 8);
    core.ports.write(0x3d5, 0x7f, 8);
    expect(core.ports.read(0x3d8, 8)).toBe(0x29);
    expect(core.ports.read(0x3d9, 8)).toBe(0x1e);
    expect(core.ports.read(0x3d5, 8)).toBe(0x7f);
    core.reset();
    expect(core.cgaCompatibility.snapshot()).toMatchObject({ mode: 0, color: 0, crtcIndex: 0 });
  });

  it("registers native VGA attribute state and resets its write flip-flop from status one", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    core.ports.write(0x3c0, 0x10, 8);
    core.ports.read(0x3da, 8);
    core.ports.write(0x3c0, 0x12, 8);
    expect(core.attributeController.snapshot()).toMatchObject({ index: 0x12, expectsData: true });
    core.ports.write(0x3c0, 0x2f, 8);
    expect(core.ports.read(0x3c1, 8)).toBe(0x2f);
    core.reset();
    expect(core.attributeController.snapshot()).toMatchObject({ index: 0, expectsData: false });
  });

  it("registers native VGA sequencer state for selected firmware", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    core.ports.write(0x3c4, 2, 8);
    core.ports.write(0x3c5, 0x0f, 8);
    expect(core.ports.read(0x3c5, 8)).toBe(0x0f);
    core.reset();
    expect(core.sequencer.snapshot()).toEqual({ index: 0, data: [0, 0, 0, 0, 0] });
  });

  it("composes VGA Input Status 0 and Feature Control with status-read port aliases", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    expect(core.ports.read(0x3c2, 8)).toBe(0x10);
    core.ports.write(0x3c8, 0, 8);
    core.ports.write(0x3c9, 0x2d, 8);
    core.ports.write(0x3c9, 0x12, 8);
    core.ports.write(0x3c9, 0x12, 8);
    expect(core.ports.read(0x3c2, 8)).toBe(0);
    core.ports.write(0x3da, 0x03, 8);
    expect(core.ports.read(0x3ca, 8)).toBe(0x03);
    expect(core.ports.read(0x3da, 8)).toBe(0);
  });

  it("advances VGA-compatible status timing separately from rendering", () => {
    const memory = new PhysicalMemory({ ramBytes: 0x1000, a20Enabled: true });
    const core = new RebuiltPcAt386Core(memory);
    expect(core.ports.read(0x3da, 8)).toBe(0);
    core.advanceVideo(1);
    expect(core.ports.read(0x3da, 8)).toBe(0x01);
    core.advanceVideo(1);
    expect(core.ports.read(0x3da, 8)).toBe(0x08);
    expect(() => core.advanceVideo(-1)).toThrow("non-negative");
  });
});
