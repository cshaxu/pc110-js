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

function writeDescriptor(bytes: Map<number, number>, type: number, dpl = 0, present = true) {
  [0xff, 0x0f, 0, 0, 0, type | 0x10 | (dpl << 5) | (present ? 0x80 : 0), 0x40, 0].forEach(
    (value, index) => bytes.set(0x108 + index, value)
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
    expect(result.bytes.get(0x20d)).toBe(0x93);
  });

  it("reads and updates GDT descriptors through supervisor paging", () => {
    const result = machine();
    result.state.writeCr0(0x80000001);
    result.state.writeCr3(0x1000);
    result.state.writeGdtr({ base: 0x4000, limit: 0x17 });
    write32(result.bytes, 0x1000, 0x2003);
    write32(result.bytes, 0x2010, 0x3003);
    [0xff, 0x0f, 0, 0, 0, 0x92, 0x40, 0].forEach((value, index) =>
      result.bytes.set(0x3008 + index, value)
    );

    loadDataSegment(result.memory, result.state, "ds", 8);

    expect(result.state.readSegment("ds")).toMatchObject({ selector: 8, limit: 0x0fff });
    expect(result.bytes.get(0x300d)).toBe(0x93);
    expect(result.bytes.get(0x1000)).toBe(0x23);
    expect(result.bytes.get(0x2010)).toBe(0x63);
  });

  it("marks successful code, data, and stack GDT descriptors accessed", () => {
    const result = machine();
    [0xff, 0x0f, 0, 0, 0, 0x9a, 0x40, 0].forEach((value, index) =>
      result.bytes.set(0x108 + index, value)
    );
    [0xff, 0x0f, 0, 0, 0, 0x92, 0x40, 0].forEach((value, index) =>
      result.bytes.set(0x110 + index, value)
    );
    [0xff, 0x0f, 0, 0, 0, 0x92, 0x40, 0].forEach((value, index) =>
      result.bytes.set(0x118 + index, value)
    );
    result.state.writeGdtr({ base: 0x100, limit: 0x1f });

    loadCodeSegment(result.memory, result.state, 8);
    loadDataSegment(result.memory, result.state, "ds", 0x10);
    loadStackSegment(result.memory, result.state, 0x18);

    expect([0x10d, 0x115, 0x11d].map((address) => result.bytes.get(address))).toEqual([
      0x9b, 0x93, 0x93
    ]);
  });

  it("does not mark a descriptor accessed before a failed validation", () => {
    const result = machine();
    writeDescriptor(result.bytes, 2);
    result.bytes.set(0x10d, 0x12);

    expect(() => loadDataSegment(result.memory, result.state, "ds", 8)).toThrow(SegmentLoadError);
    expect(result.bytes.get(0x10d)).toBe(0x12);
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

  it("classifies code, data, and stack selector faults without committing a cache", () => {
    for (const [load, type, selector, dpl, present, vector, errorCode] of [
      [loadCodeSegment, 2, 8, 0, true, 13, 8],
      [loadCodeSegment, 10, 8, 0, false, 11, 8],
      [loadCodeSegment, 10, 0x0b, 0, true, 13, 0x0b],
      [loadDataSegment, 8, 8, 0, true, 13, 8],
      [loadDataSegment, 2, 0x0b, 0, true, 13, 0x0b],
      [loadDataSegment, 2, 8, 0, false, 11, 8],
      [loadStackSegment, 0, 8, 0, true, 13, 8],
      [loadStackSegment, 2, 0x0b, 0, true, 13, 0x0b],
      [loadStackSegment, 2, 8, 0, false, 12, 8]
    ] as const) {
      const result = machine();
      writeDescriptor(result.bytes, type, dpl, present);
      const name = load === loadCodeSegment ? "cs" : load === loadStackSegment ? "ss" : "ds";
      const before = result.state.readSegment(name);
      const invoke = () => {
        if (name === "cs") return loadCodeSegment(result.memory, result.state, selector);
        if (name === "ss") return loadStackSegment(result.memory, result.state, selector);
        return loadDataSegment(result.memory, result.state, "ds", selector);
      };

      expect(invoke).toThrow(SegmentLoadError);
      try {
        invoke();
      } catch (error) {
        expect(error).toMatchObject({ vector, errorCode });
      }
      expect(result.state.readSegment(name)).toEqual(before);
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

function write32(bytes: Map<number, number>, address: number, value: number): void {
  bytes.set(address, value & 0xff);
  bytes.set(address + 1, (value >>> 8) & 0xff);
  bytes.set(address + 2, (value >>> 16) & 0xff);
  bytes.set(address + 3, (value >>> 24) & 0xff);
}
