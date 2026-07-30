import { describe, expect, it } from "vitest";
import { PageFaultError } from "../../../memory/address-translation.js";
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

function write32(bytes: Uint8Array, address: number, value: number): void {
  bytes[address] = value & 0xff;
  bytes[address + 1] = (value >>> 8) & 0xff;
  bytes[address + 2] = (value >>> 16) & 0xff;
  bytes[address + 3] = (value >>> 24) & 0xff;
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

  it("walks 80386 page tables for data reads and writes", () => {
    const state = new RebuiltCpuState();
    const bytes = new Uint8Array(0x5000);
    state.writeCr0(0x80000001);
    state.writeCr3(0x1000);
    state.writeSegment("ds", { selector: 8, base: 0, limit: 0xffffffff, default32: true, dpl: 0 });
    write32(bytes, 0x1000, 0x2003);
    write32(bytes, 0x2000, 0x3003);
    bytes[0x3000] = 0x5a;
    const segmented = new SegmentedMemory(memory(bytes), state);

    expect(segmented.read8("ds", 0, 32)).toBe(0x5a);
    segmented.write8("ds", 1, 0xa5, 32);
    expect(bytes[0x3001]).toBe(0xa5);
    expect(bytes[0x1000] & 0x20).toBe(0x20);
    expect(bytes[0x2000] & 0x60).toBe(0x60);
  });

  it("records CR2 when a rebuilt memory access hits a page fault", () => {
    const state = new RebuiltCpuState();
    state.writeCr0(0x80000001);
    state.writeCr3(0x1000);
    state.writeSegment("ds", {
      selector: 8,
      base: 0x400000,
      limit: 0xffffffff,
      default32: true,
      dpl: 0
    });
    const segmented = new SegmentedMemory(memory(new Uint8Array(0x3000)), state);

    expect(() => segmented.read8("ds", 0, 32)).toThrow(PageFaultError);
    expect(state.readCr2()).toBe(0x400000);
  });
});
