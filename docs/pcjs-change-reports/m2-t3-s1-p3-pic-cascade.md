# M2 T3 S1 P3 PCjs Change Report: PIC Cascade

## Summary

- Affected PCjs-derived subsystem: PC/AT chipset PIC cascade behavior.
- Changed product behavior: project-native master/slave composition only.

## Basis

- Read-only PCjs `chipset.js` records the selected PC/AT slave connection on
  master IRQ2 and the four PIC port addresses.

## Boundary And Verification

- The TypeScript device composes local PIC state without importing PCjs.
- Focused tests cover cascade vectors, masks, EOI ordering, and rebuilt port
  bus ranges. CPU interrupt admission and browser workload evidence are not
  claimed by this part.

## Future Path

- P4 connects pending PIC vectors to the rebuilt CPU external-interrupt
  boundary without changing PIC port behavior.
