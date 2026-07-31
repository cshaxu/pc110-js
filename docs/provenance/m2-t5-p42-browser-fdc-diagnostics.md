# M2 T5 P42 Provenance

- Authority: project-native browser workload diagnostic requirement.
- Evidence source: the existing `Fdc765` snapshot and composed selected-machine
  floppy controller state.
- Boundary: P42 exposes only read-only browser checkpoint fields. It changes
  no FDC command, DMA, IRQ, timing, media, or CPU behavior.
