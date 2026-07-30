# M2 T3 S7 BIOS POST Checkpoint Evidence

## Claim

The selected DeskPro 386 ROM's first missing I/O operation is a real spare DMA
page-register write at `0x84`, used as a POST checkpoint. It requires durable
byte-register behavior, not an ignored diagnostic-port write.

## Evidence

- Level: Strong.
- Source: pinned read-only PCjs
  `machines/pcx86/modules/v2/chipset.js`, DMA Page Registers commentary and
  selected 5170 port input/output tables for `0x80`, `0x84`, `0x85`, `0x86`,
  `0x88`, `0x8C`, `0x8D`, and `0x8E`.
- Reproduction: `pnpm run trace:rebuilt-rom` reports the two-instruction stop
  at `F000:F907` on `Unmapped I/O write port: 0x84` before P2.

## Accepted Boundary

The spare cells are project-native hardware state. They do not imply a DMA
transfer, storage device, display device, firmware modification, browser
presentation, DOS execution, or PC110 behavior.
