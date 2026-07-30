# M2 T3 S2 P2 PCjs Change Report: PIT Counter Core

## Summary

- Affected PCjs-derived subsystem: PC/AT PIT counter behavior.
- Changed product behavior: project-native binary counter state only.

## Basis

- PCjs establishes selected PC/AT PIT counter ownership, port protocol, and
  timer output roles; this part uses no PCjs runtime or source translation.

## Boundary And Verification

- The TypeScript core advances only from explicit emulated ticks and has no
  host timer, CPU, PIC, port, firmware, or audio dependency.
- Focused tests cover the implemented counter-control and output behavior.

## Future Path

- P3 composes the counters with the native port bus and PIC IRQ0 path.
