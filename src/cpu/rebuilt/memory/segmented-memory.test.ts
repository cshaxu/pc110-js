import { describe, expect, it } from "vitest";
import { PageFaultError } from "../../../memory/address-translation.js";
import { SegmentAccessError, SegmentedMemory, type RebuiltMemoryBus } from "./segmented-memory.js";
import { RebuiltCpuState } from "../state/cpu-state.js";
import { pushStack } from "./stack.js";

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

  it("preflights all pages for multi-byte reads and writes", () => {
    const state = new RebuiltCpuState();
    const bytes = new Uint8Array(0x6000);
    state.writeCr0(0x80000001);
    state.writeCr3(0x1000);
    state.writeSegment("ds", { selector: 8, base: 0, limit: 0xffffffff, default32: true, dpl: 0 });
    write32(bytes, 0x1000, 0x2003);
    write32(bytes, 0x2000, 0x3003);
    write32(bytes, 0x2004, 0x4003);
    bytes.set([0x78, 0x56], 0x3ffe);
    bytes.set([0x34, 0x12], 0x4000);
    const segmented = new SegmentedMemory(memory(bytes), state);

    expect(segmented.read32("ds", 0xffe, 32)).toBe(0x12345678);
    segmented.write32("ds", 0xffe, 0xa5a55a5a, 32);
    expect(Array.from(bytes.slice(0x3ffe, 0x4002))).toEqual([0x5a, 0x5a, 0xa5, 0xa5]);
  });

  it("does not partially write when a later cross-page translation faults", () => {
    const state = new RebuiltCpuState();
    const bytes = new Uint8Array(0x5000);
    state.writeCr0(0x80000001);
    state.writeCr3(0x1000);
    state.writeSegment("ds", { selector: 8, base: 0, limit: 0xffffffff, default32: true, dpl: 0 });
    write32(bytes, 0x1000, 0x2003);
    write32(bytes, 0x2000, 0x3003);
    bytes.set([0xaa, 0xbb], 0x3ffe);
    const segmented = new SegmentedMemory(memory(bytes), state);

    expect(() => segmented.write32("ds", 0xffe, 0x12345678, 32)).toThrow(PageFaultError);
    expect(Array.from(bytes.slice(0x3ffe, 0x4000))).toEqual([0xaa, 0xbb]);
    expect(state.readCr2()).toBe(0x1000);
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

  it("enforces cached protected segment access and expand-down bounds", () => {
    const state = new RebuiltCpuState();
    state.writeCr0(1);
    state.writeSegment("ds", {
      selector: 8,
      base: 0,
      limit: 0xffff,
      default32: false,
      valid: true,
      dpl: 0,
      executable: false,
      readable: true,
      writable: false,
      expandDown: false
    });
    const bytes = new Uint8Array(0x20000);
    const segmented = new SegmentedMemory(memory(bytes), state);
    expect(() => segmented.write8("ds", 0, 1, 16)).toThrow(SegmentAccessError);

    state.writeSegment("ds", {
      selector: 8,
      base: 0,
      limit: 0x7fff,
      default32: false,
      valid: true,
      dpl: 0,
      executable: false,
      readable: true,
      writable: true,
      expandDown: true
    });
    bytes[0x8000] = 0x5a;
    expect(segmented.read8("ds", 0x8000, 16)).toBe(0x5a);
    expect(() => segmented.read8("ds", 0x7fff, 16)).toThrow(SegmentAccessError);
  });

  it("rejects a protected multi-byte access that crosses a segment limit", () => {
    const state = new RebuiltCpuState();
    state.writeCr0(1);
    state.writeSegment("ds", {
      selector: 8,
      base: 0,
      limit: 0xffff,
      default32: false,
      valid: true,
      dpl: 0,
      executable: false,
      readable: true,
      writable: true,
      expandDown: false
    });
    const segmented = new SegmentedMemory(memory(new Uint8Array(0x20000)), state);

    expect(() => segmented.read16("ds", 0xffff, 16)).toThrow(SegmentAccessError);
    expect(() => segmented.write32("ds", 0xfffe, 1, 16)).toThrow(SegmentAccessError);
  });

  it("uses virtual-8086 real-style segments and a 16-bit stack address", () => {
    const state = new RebuiltCpuState();
    state.writeCr0(1);
    state.flags.write(0x00020000);
    state.writeSegment("ds", {
      selector: 0x1234,
      base: 0,
      limit: 0,
      default32: true,
      valid: false,
      writable: false
    });
    state.writeSegment("ss", {
      selector: 0x2000,
      base: 0,
      limit: 0,
      default32: true,
      valid: false,
      writable: false
    });
    state.registers.write32(4, 0xabcd0002);
    const bytes = new Uint8Array(0x30000);
    bytes[0x12340] = 0x5a;
    const segmented = new SegmentedMemory(memory(bytes), state);

    expect(segmented.read8("ds", 0, 16)).toBe(0x5a);
    pushStack(segmented, state, 16, 0x1234);
    expect(state.registers.read32(4)).toBe(0xabcd0000);
    expect(bytes[0x20000]).toBe(0x34);
    expect(bytes[0x20001]).toBe(0x12);
  });

  it("retains paging and requests user access in virtual-8086 mode", () => {
    const state = new RebuiltCpuState();
    const bytes = new Uint8Array(0x4000);
    state.writeCr0(0x80000001);
    state.writeCr3(0x1000);
    state.flags.write(0x00020000);
    state.writeSegment("ds", {
      selector: 0,
      base: 0,
      limit: 0,
      default32: true,
      valid: false
    });
    write32(bytes, 0x1000, 0x2003);
    write32(bytes, 0x2000, 0x3003);
    const segmented = new SegmentedMemory(memory(bytes), state);

    expect(() => segmented.read8("ds", 0, 16)).toThrow(PageFaultError);
    try {
      segmented.read8("ds", 0, 16);
    } catch (error) {
      expect(error).toMatchObject({ access: { user: true }, linearAddress: 0 });
    }
  });
});
