# M2 T5 P58 Provenance

- Authority: P55's real firmware mismatch requires short deterministic replay
  from an atomic checkpoint, not ordinary long execution.
- Contract: FDC capture includes command/result/interrupt queues, DMA bytes,
  drive positions, and controller registers. Floppy capture contains only
  project-owned raw media bytes and metadata; no host path is retained.
- Boundary: restoring the PC/AT FDC recomputes its DMA request but does not
  synthesize an IRQ. This is still not a complete machine checkpoint.
