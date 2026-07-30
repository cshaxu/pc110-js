import { describe, expect, it } from "vitest";
import { createRomImage } from "../firmware/rom-image.js";
import { PhysicalMemory } from "../memory/physical-memory.js";
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
});
