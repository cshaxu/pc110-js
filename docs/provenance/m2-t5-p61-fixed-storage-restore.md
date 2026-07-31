# M2 T5 P61 Provenance

- Authority: atomic diagnostic replay must preserve attached fixed-storage
  controller progress and mutable raw media, not only a register snapshot.
- Contract: capture includes PIO transfer bytes, direction, offset, CHS state,
  interrupt state, and mounted media. Restore rejects changed drive topology
  and does not emit a new IRQ.
- Boundary: this is project-native raw storage state, with no filesystem,
  host path, BIOS, DOS, or guest-service behavior.
