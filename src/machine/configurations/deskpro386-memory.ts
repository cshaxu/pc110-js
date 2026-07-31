import { PhysicalMemory } from "../../memory/physical-memory.js";

export const DESKPRO386_LOW_RAM_BYTES = 0xa0000;
export const DESKPRO386_EXTENDED_RAM_START = 0x100000;
export const DESKPRO386_EXTENDED_RAM_BYTES = 0x300000;
export const DESKPRO386_RELOCATABLE_RAM_START = 0xfa0000;
export const DESKPRO386_RELOCATABLE_RAM_BYTES = 0x60000;

/** Creates the ROM-evidenced RAM apertures for the selected DeskPro 386 profile. */
export function createDeskPro386Memory(): PhysicalMemory {
  const memory = new PhysicalMemory({
    ramBytes: DESKPRO386_LOW_RAM_BYTES,
    a20Enabled: true,
    unmappedReadValue: 0xff,
    ignoreUnmappedWrites: true
  });
  memory.mapRam(DESKPRO386_EXTENDED_RAM_START, DESKPRO386_EXTENDED_RAM_BYTES);
  memory.mapRam(DESKPRO386_RELOCATABLE_RAM_START, DESKPRO386_RELOCATABLE_RAM_BYTES);
  return memory;
}
