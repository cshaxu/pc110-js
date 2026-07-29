import { describe, expect, it } from "vitest";
import {
  addressMode,
  AddressTranslationError,
  CR0_PAGING,
  CR0_PROTECTED_MODE,
  EFLAGS_VIRTUAL_8086,
  translateLinearAddress,
  translateSegmentOffset
} from "./address-translation.js";

describe("80386 address translation", () => {
  it("selects real, protected, and virtual-8086 modes", () => {
    expect(addressMode(0, 0)).toBe("real");
    expect(addressMode(CR0_PROTECTED_MODE, 0)).toBe("protected");
    expect(addressMode(CR0_PROTECTED_MODE, EFLAGS_VIRTUAL_8086)).toBe("virtual-8086");
  });

  it("translates real and protected segment offsets", () => {
    expect(
      translateSegmentOffset("real", { selector: 0xf000, base: 0, limit: 0, present: true }, 0xfff0)
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
    const memory = { readUint32: (address: number) => values.get(address) ?? 0 };
    const linear = (1 << 22) | (2 << 12) | 0x345;

    expect(
      translateLinearAddress(memory, CR0_PAGING, 0x1000, linear, { write: false, user: true })
    ).toBe(0x3345);
  });
});
