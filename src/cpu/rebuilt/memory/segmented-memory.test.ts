import { describe, expect, it } from "vitest";
import { SegmentedMemory, type RebuiltMemoryBus } from "./segmented-memory.js";
import { RebuiltCpuState } from "../state/cpu-state.js";

function memory(bytes: Uint8Array): RebuiltMemoryBus {
  return {
    readUint8: (address) => bytes[address] ?? 0,
    writeUint8: (address, value) => {
      bytes[address] = value;
    }
  };
}

describe("SegmentedMemory", () => {
  it("uses the selected segment base and 16-bit wrapping for multi-byte access", () => {
    const state = new RebuiltCpuState();
    state.writeSegment("ds", { selector: 0, base: 0x1000, limit: 0xffff, default32: false });
    const bytes = new Uint8Array(0x11000);
    bytes[0x10fff] = 0x34;
    bytes[0x1000] = 0x12;
    const segmented = new SegmentedMemory(memory(bytes), state);

    expect(segmented.read16("ds", 0xffff, 16)).toBe(0x1234);
  });

  it("keeps code-size EIP commitment separate from address-size memory access", () => {
    const state = new RebuiltCpuState();
    state.writeEip(0xfffe);
    state.advanceEip(4);
    expect(state.readEip()).toBe(2);
    state.writeSegment("cs", { selector: 8, base: 0, limit: 0xffffffff, default32: true });
    state.writeEip(0xfffffffe);
    state.advanceEip(4);
    expect(state.readEip()).toBe(2);
  });
});
