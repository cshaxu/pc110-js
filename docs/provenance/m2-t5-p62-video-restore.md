# M2 T5 P62 Provenance

- Authority: the atomic diagnostic boundary requires video register, timing,
  plane, and latch state, not a browser canvas or observational snapshot.
- Contract: capture preserves project-native VGA/MDA/CGA state and copies it
  only during an explicit bounded diagnostic checkpoint, never Fast execution.
- Boundary: Input Status 0 has no independent mutable state; it is derived
  from captured DAC state. No browser renderer, host clock, or PCjs code is
  involved.
