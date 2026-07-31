# M2 T5 P54 PCjs Change Report: Native Keyboard BAT

## Basis

PCjs `machines/pcx86/modules/v2/chipset.js` documents that the compatible BIOS
writes controller command `0x60`, then `0x4D`, which releases keyboard clock
and data and expects BAT `0xAA` in the controller output buffer.

## Project Change

Added a small TypeScript AT keyboard power-on state machine. It emits one BAT
byte only after both controller-owned lines become enabled; the existing native
8042 still owns port state, buffering, and IRQ1.

## Boundary

PCjs is unchanged and remains a read-only behavioral authority. No PCjs source
was copied, and no BIOS, BDA, DOS, or guest-service behavior was introduced.
