import { describe, expect, it } from "vitest";
import {
  createDeskPro386Memory,
  DESKPRO386_EXTENDED_RAM_BYTES,
  DESKPRO386_EXTENDED_RAM_START,
  DESKPRO386_RELOCATABLE_RAM_START
} from "./deskpro386-memory.js";

describe("selected DeskPro 386 memory layout", () => {
  it("maps separate low, extended, and relocatable writable RAM apertures", () => {
    const memory = createDeskPro386Memory();

    memory.writeUint8(0x9ffff, 0x11);
    memory.writeUint8(DESKPRO386_EXTENDED_RAM_START, 0x22);
    memory.writeUint8(DESKPRO386_EXTENDED_RAM_START + DESKPRO386_EXTENDED_RAM_BYTES - 1, 0x44);
    memory.writeUint8(DESKPRO386_RELOCATABLE_RAM_START, 0x33);

    expect(memory.readUint8(0x9ffff)).toBe(0x11);
    expect(memory.readUint8(DESKPRO386_EXTENDED_RAM_START)).toBe(0x22);
    expect(
      memory.readUint8(DESKPRO386_EXTENDED_RAM_START + DESKPRO386_EXTENDED_RAM_BYTES - 1)
    ).toBe(0x44);
    expect(memory.readUint8(DESKPRO386_RELOCATABLE_RAM_START)).toBe(0x33);
    expect(memory.readUint8(0xa0000)).toBe(0xff);
    expect(memory.readUint8(DESKPRO386_EXTENDED_RAM_START + DESKPRO386_EXTENDED_RAM_BYTES)).toBe(
      0xff
    );
  });
});
