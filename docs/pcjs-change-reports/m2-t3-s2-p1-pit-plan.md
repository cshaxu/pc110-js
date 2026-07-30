# M2 T3 S2 P1 PCjs Change Report: PIT Plan

## Summary

- Affected PCjs-derived subsystem: PC/AT PIT and speaker-clock behavior.
- Changed product behavior: none; this part records a project-native plan.

## Basis

- PCjs is the selected standard PC/AT behavioral reference for PIT ports,
  IRQ0, and counter-2 wiring.

## Boundary

- Future product code will be original TypeScript and must not import PCjs.
- The plan explicitly excludes PCjs timing workarounds, host scheduling,
  firmware behavior, and system-port speaker gating.

## Future Path

- Each executable PIT part will add focused behavior evidence and update this
  provenance boundary without broadening into T3 S5.
