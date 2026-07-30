# M2 T3 S7 BIOS POST Checkpoint Provenance

## Reference Boundary

- Behavioral reference: pinned read-only PCjs
  `machines/pcx86/modules/v2/chipset.js`, DMA page-register definitions and
  selected 5170/DeskPro port tables.
- Selected ROM: pinned DeskPro 386 ROM loaded by
  `src/reference/rebuilt-rom-trace.ts` from the declared PCjs commit.
- Product code: original TypeScript only; no PCjs runtime, chipset source,
  firmware patch, media, host service, or guest-service behavior is imported.

## Initial POST Boundary

The bounded selected-ROM trace executes the reset far jump and reaches
`F000:F907`, where it writes to `0x84`. PCjs documents `0x84` as spare DMA page
register index 0, one of the 74LS612 unassigned cells, and identifies the
DeskPro 386's use of it as a POST checkpoint register.

## P1 Plan Boundary

S7 will represent the selected spare-port group as real byte state in the
existing project-native DMA composition. It will preserve normal channel page
register behavior and advance the ROM only after focused tests and a fresh
bounded trace prove the path. Future device work remains classified trace work,
not a BIOS workaround.
