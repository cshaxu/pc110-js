import { describe, expect, it } from "vitest";
import {
  addressMode,
  AddressTranslationError,
  CR0_PAGING,
  CR0_PROTECTED_MODE,
  EFLAGS_VIRTUAL_8086,
  PageFaultError,
  translateLinearAddress,
  translateSegmentOffset
} from "./address-translation.js";

describe("80386 address translation", () => {
  it("selects real, protected, and virtual-8086 modes", () => {
    expect(addressMode(0, 0)).toBe("real");
    expect(addressMode(CR0_PROTECTED_MODE, 0)).toBe("protected");
    expect(addressMode(CR0_PROTECTED_MODE, EFLAGS_VIRTUAL_8086)).toBe("virtual-8086");
  });

  it("uses cached real-mode segment bases and protected segment offsets", () => {
    expect(
      translateSegmentOffset(
        "real",
        { selector: 0xf000, base: 0xffff0000, limit: 0xffff, present: true },
        0xfff0
      )
    ).toBe(0xfffffff0);
    expect(
      translateSegmentOffset(
        "real",
        { selector: 0xf000, base: 0x000f0000, limit: 0xffff, present: true },
        0xfff0
      )
    ).toBe(0xffff0);
    expect(
      translateSegmentOffset(
        "protected",
        { selector: 8, base: 0x400000, limit: 0xffff, present: true },
        0x1234
      )
    ).toBe(0x401234);
    expect(() =>
      translateSegmentOffset(
        "protected",
        { selector: 8, base: 0, limit: 0xff, present: true },
        0x100
      )
    ).toThrow(AddressTranslationError);
  });

  it("walks an 80386 two-level page table", () => {
    const values = new Map<number, number>([
      [0x1000 + 4, 0x2007],
      [0x2000 + 8, 0x3007]
    ]);
    const memory = {
      readUint32: (address: number) => values.get(address) ?? 0,
      writeUint32: (address: number, value: number) => values.set(address, value >>> 0)
    };
    const linear = (1 << 22) | (2 << 12) | 0x345;

    expect(
      translateLinearAddress(memory, CR0_PAGING, 0x1000, linear, { write: false, user: true })
    ).toBe(0x3345);
    expect(values.get(0x1004)).toBe(0x2027);
    expect(values.get(0x2008)).toBe(0x3027);
  });

  it("reports page-fault metadata and marks dirty pages", () => {
    const values = new Map<number, number>([
      [0x1000, 0x2007],
      [0x2000, 0x3007]
    ]);
    const memory = {
      readUint32: (address: number) => values.get(address) ?? 0,
      writeUint32: (address: number, value: number) => values.set(address, value >>> 0)
    };
    expect(translateLinearAddress(memory, CR0_PAGING, 0x1000, 0, { write: true, user: true })).toBe(
      0x3000
    );
    expect(values.get(0x2000)).toBe(0x3067);
    expect(() =>
      translateLinearAddress(memory, CR0_PAGING, 0x1000, 0x400000, { write: false, user: false })
    ).toThrow(PageFaultError);
  });

  it("classifies directory and table faults without modifying rejected entries", () => {
    const fault = (
      directoryEntry: number,
      tableEntry: number,
      access: { write: boolean; user: boolean }
    ) => {
      const values = new Map<number, number>([
        [0x1000, directoryEntry],
        [0x2000, tableEntry]
      ]);
      const memory = {
        readUint32: (address: number) => values.get(address) ?? 0,
        writeUint32: (address: number, value: number) => values.set(address, value >>> 0)
      };
      try {
        translateLinearAddress(memory, CR0_PAGING, 0x1000, 0, access);
        throw new Error("Expected page fault");
      } catch (error) {
        expect(error).toBeInstanceOf(PageFaultError);
        return { error: error as PageFaultError, values };
      }
    };

    const missingDirectory = fault(0x2000, 0x3007, { write: true, user: true });
    expect(missingDirectory.error).toMatchObject({
      linearAddress: 0,
      present: false,
      access: { write: true, user: true }
    });
    expect(missingDirectory.values.get(0x1000)).toBe(0x2000);

    const missingTable = fault(0x2007, 0x3000, { write: false, user: false });
    expect(missingTable.error).toMatchObject({
      linearAddress: 0,
      present: false,
      access: { write: false, user: false }
    });
    expect(missingTable.values.get(0x1000)).toBe(0x2027);
    expect(missingTable.values.get(0x2000)).toBe(0x3000);
  });

  it("enforces user permissions at both paging levels and preserves fault metadata", () => {
    const fault = (
      directoryEntry: number,
      tableEntry: number,
      access: { write: boolean; user: boolean }
    ) => {
      const values = new Map<number, number>([
        [0x1000, directoryEntry],
        [0x2000, tableEntry]
      ]);
      const memory = {
        readUint32: (address: number) => values.get(address) ?? 0,
        writeUint32: (address: number, value: number) => values.set(address, value >>> 0)
      };
      try {
        translateLinearAddress(memory, CR0_PAGING, 0x1000, 0, access);
        throw new Error("Expected page fault");
      } catch (error) {
        expect(error).toBeInstanceOf(PageFaultError);
        return { error: error as PageFaultError, values };
      }
    };

    const supervisorDirectory = fault(0x2003, 0x3007, { write: false, user: true });
    expect(supervisorDirectory.error).toMatchObject({
      present: true,
      access: { write: false, user: true }
    });
    expect(supervisorDirectory.values.get(0x1000)).toBe(0x2003);

    const readOnlyTable = fault(0x2007, 0x3005, { write: true, user: true });
    expect(readOnlyTable.error).toMatchObject({
      present: true,
      access: { write: true, user: true }
    });
    expect(readOnlyTable.values.get(0x1000)).toBe(0x2027);
    expect(readOnlyTable.values.get(0x2000)).toBe(0x3005);
  });

  it("updates accessed and dirty bits only for successful NXVM-style accesses", () => {
    const values = new Map<number, number>([
      [0x1000, 0x2001],
      [0x2000, 0x3001]
    ]);
    const memory = {
      readUint32: (address: number) => values.get(address) ?? 0,
      writeUint32: (address: number, value: number) => values.set(address, value >>> 0)
    };

    expect(
      translateLinearAddress(memory, CR0_PAGING, 0x1000, 0x234, { write: true, user: false })
    ).toBe(0x3234);
    expect(values.get(0x1000)).toBe(0x2021);
    expect(values.get(0x2000)).toBe(0x3061);
  });
});
