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

## P3 Raw-Media Evidence

- Level: Strong.
- Source: M1 machine contract and local-media identity record establish the
  1.44MB size; standard CHS geometry derives the selected `80 x 2 x 18 x 512`
  raw-sector mapping.
- Tests: complete-size validation, CHS translation and range checks, attach,
  eject, write protection, writable sectors, and defensive copies.
- Boundary: no protected bytes, image loading, FDC attachment, DMA, IRQ, BIOS,
  DOS, or filesystem behavior is present.

## P4 Read-Execution Evidence

- Level: Strong.
- Source: pinned read-only PCjs FDC ports, DMA2/IRQ6 ownership, register
  phases, and selected raw-sector behavior.
- Tests: READ ID CHRN results, READ DATA execution bytes, result transition,
  terminal-count completion, byte-wide ports, DOR reset IRQ6, and a native
  DMA2 raw-sector transfer into physical memory.
- Boundary: no protected local image is auto-attached; write/format commands,
  host timing, BIOS service, DOS, and filesystem behavior remain absent.
- Trace: the selected ROM advances to 221 instructions at `F000:BB30` and
  stops on display-domain I/O write `0x3B8`; no display response is added by
  this storage part.
