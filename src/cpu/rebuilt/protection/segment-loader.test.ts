import { describe, expect, it } from "vitest";
import { SegmentedMemory } from "../memory/segmented-memory.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import {
  loadCodeSegment,
  loadDataSegment,
  loadStackSegment,
  SegmentLoadError
} from "./segment-loader.js";

function machine() {
  const state = new RebuiltCpuState();
  state.writeCr0(1);
  state.writeSegment("cs", {
    selector: 3,
    base: 0,
    limit: 0xffffffff,
    default32: true,
    dpl: 0
  });
  state.writeGdtr({ base: 0x100, limit: 0x17 });
  const bytes = new Map<number, number>();
  const memory = new SegmentedMemory(
    {
      readUint8: (address) => bytes.get(address) ?? 0,
      writeUint8: (address, value) => bytes.set(address, value)
    },
    state
  );
  return { state, bytes, memory };
}

function writeDescriptor(bytes: Map<number, number>, type: number) {
  [0xff, 0x0f, 0, 0, 0, type | 0x90, 0x40, 0].forEach((value, index) =>
    bytes.set(0x108 + index, value)
  );
}

describe("rebuilt segment loader hidden CPL", () => {
  it("uses CS cached DPL rather than CS selector RPL for data and code loads", () => {
    const data = machine();
    writeDescriptor(data.bytes, 2);
    loadDataSegment(data.memory, data.state, "ds", 8);
    expect(data.state.readSegment("ds")).toMatchObject({ selector: 8, dpl: 0, valid: true });

    const code = machine();
    writeDescriptor(code.bytes, 0xa);
    loadCodeSegment(code.memory, code.state, 8);
    expect(code.state.readSegment("cs")).toMatchObject({ selector: 8, dpl: 0, valid: true });
  });

  it("resolves a data selector through the active LDTR table", () => {
    const result = machine();
    result.state.writeLdtr({ selector: 0x10, base: 0x200, limit: 0x17, default32: false });
    [0xff, 0x0f, 0, 0, 0, 0x92, 0x40, 0].forEach((value, index) =>
      result.bytes.set(0x208 + index, value)
    );
    loadDataSegment(result.memory, result.state, "ds", 0x0c);
    expect(result.state.readSegment("ds")).toMatchObject({
      selector: 0x0c,
      limit: 0x0fff,
      valid: true
    });
  });

  it("classifies selector type, presence, and stack errors", () => {
    const missing = machine();
    writeDescriptor(missing.bytes, 2);
    missing.bytes.set(0x10d, 0x12);
    expect(() => loadDataSegment(missing.memory, missing.state, "ds", 8)).toThrow(SegmentLoadError);
    try {
      loadDataSegment(missing.memory, missing.state, "ds", 8);
    } catch (error) {
      expect(error).toMatchObject({ vector: 11, errorCode: 8 });
    }

    const stack = machine();
    expect(() => loadStackSegment(stack.memory, stack.state, 0)).toThrow(SegmentLoadError);
    try {
      loadStackSegment(stack.memory, stack.state, 0);
    } catch (error) {
      expect(error).toMatchObject({ vector: 13, errorCode: 0 });
    }
  });

  it("loads virtual-8086 segment caches without descriptor-table lookup", () => {
    const result = machine();
    result.state.flags.write(0x00020000);
    loadDataSegment(result.memory, result.state, "ds", 0x1234);
    expect(result.state.readSegment("ds")).toMatchObject({
      selector: 0x1234,
      base: 0x12340,
      limit: 0xffff,
      default32: false,
      dpl: 3,
      valid: true
    });
  });
});
