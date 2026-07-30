# M2 T3 S2 P3 PCjs Change Report: PIT PIC Integration

## Summary

- Affected PCjs-derived subsystem: PC/AT PIT ports and counter-0 IRQ0 wiring.
- Changed product behavior: project-native PIT/PIC machine composition only.

## Basis

- PCjs records the selected PIT port map and timer-0 IRQ role. This product
  implementation uses explicit emulated ticks rather than PCjs scheduling code.

## Boundary And Verification

- Native port, PIT, PIC, and CPU interfaces are composed without PCjs imports.
- Focused tests cover port width, edge timing, IRQ0, and CPU delivery.

## Future Path

- Scheduler selection, system-port speaker gating, and audio remain out of
  scope for this part.
