# M2 T4 S1 Floppy Controller Evidence

## Claim

The selected ROM's write to `0x3F2` requires a real PC/AT FDC path, including
controller reset/enable state and eventual DMA2/IRQ6 wiring. It is not a POST
checkpoint or a safe ignored port.

## Evidence

- Level: Strong.
- Source: pinned read-only PCjs `fdc.js` register definitions and handlers;
  `chipset.js` labels FDC DMA channel 2 and IRQ6.
- Reproduction: `pnpm run trace:rebuilt-rom` after M2 T3 S7 P5 stops at
  `F000:BB26` on `Unmapped I/O write port: 0x3F2`.

## Accepted Boundary

The first implementation part owns the complete FDC behavior contract and
does not attach media, emulate BIOS services, fabricate commands/results, or
claim a boot-sector read.

## P2 Controller-Core Evidence

- Level: Strong.
- Source: pinned read-only PCjs `fdc.js`, DOR/main-status/data/control
  definitions and selected command dispatch.
- Tests: DOR reset completion, command/result state, main-status direction,
  drive sense, seek/recalibrate completion, invalid command, and disabled
  controller paths.
- Boundary: raw media, READ ID/READ DATA transfer, DMA2, IRQ6 port wiring,
  and boot-sector reads remain future parts.
