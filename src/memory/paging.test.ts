import { describe, expect, it } from "vitest";
import { CR0_PAGING, PageFaultError, type PageTableMemory } from "./address-translation.js";
import { PagingTranslator } from "./paging.js";
import { Cpu386State } from "../cpu/x86/state.js";

describe("PagingTranslator", () => {
  it("flushes cached translations when CR3 changes", () => {
    const values = new Map<number, number>([
      [0x1000, 0x2007],
      [0x2000, 0x3007],
      [0x4000, 0x5007],
      [0x5000, 0x6007]
    ]);
    const memory: PageTableMemory = {
      readUint32: (address) => values.get(address) ?? 0,
      writeUint32: (address, value) => values.set(address, value >>> 0)
    };
    const state = new Cpu386State();
    const paging = new PagingTranslator(memory, state, CR0_PAGING);

    paging.writeCr3(0x1000);
    expect(paging.translate(0x123, { user: true, write: false })).toBe(0x3123);
    paging.writeCr3(0x4000);
    expect(paging.translate(0x123, { user: true, write: false })).toBe(0x6123);
    expect(state.snapshot().cr3).toBe(0x4000);
  });

  it("records CR2 for page faults", () => {
    const memory: PageTableMemory = { readUint32: () => 0, writeUint32: () => undefined };
    const state = new Cpu386State();
    const paging = new PagingTranslator(memory, state, CR0_PAGING);

    expect(() => paging.translate(0xdeadbeef, { user: false, write: false })).toThrow(
      PageFaultError
    );
    expect(state.snapshot().cr2).toBe(0xdeadbeef);
  });
});
