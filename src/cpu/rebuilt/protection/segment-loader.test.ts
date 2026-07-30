import { describe, expect, it } from "vitest";
import { SegmentedMemory } from "../memory/segmented-memory.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { loadCodeSegment, loadDataSegment } from "./segment-loader.js";

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
});
