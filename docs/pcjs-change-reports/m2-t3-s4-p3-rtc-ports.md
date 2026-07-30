# M2 T3 S4 P3 PCjs Change Report: RTC/CMOS Ports

## Summary

- Affected PCjs-derived subsystem: PC/AT RTC/CMOS port protocol and RTC IRQ8.
- Changed product behavior: adds original TypeScript `0x70`/`0x71` port
  composition and explicit RTC-to-PIC IRQ8 wiring.

## Basis

- PCjs documents the selected address/data port pair, address bit 7 NMI-mask
  relation, and RTC IRQ8 relation.

## Boundary

- Address bit 7 is retained as a future S5 signal only. The composition uses
  no PCjs import, host scheduler, NMI delivery, firmware, storage, media, or
  guest-service behavior.

## Verification

- Focused tests cover 8-bit port access, index/data behavior, observable NMI
  boundary, explicit event advancement, IRQ8 signaling, and reset state.
