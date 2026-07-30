# M2 T3 S1 P2 PCjs Change Report: PIC Core

## Summary

- Affected PCjs-derived subsystem: chipset PIC behavior used as a read-only reference.
- Changed product behavior: project-native 8259A core only.

## Basis

- PCjs `chipset.js` documents the selected PC/AT PIC port protocol, ICW/OCW
  sequencing, fixed priority, and IRR/ISR behavior.

## Verification

- Focused project-native PIC tests cover the implemented controller state.
