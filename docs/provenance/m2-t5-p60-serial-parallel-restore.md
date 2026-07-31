# M2 T5 P60 Provenance

- Authority: the M2 diagnostic checkpoint boundary includes every attached
  native serial and parallel device, not only devices on the current ROM path.
- Contract: capture preserves register, FIFO, and IRQ-selection state. Restore
  does not call host transport callbacks or inject a new PIC request.
- Boundary: fixed storage, VGA, and final machine composition remain pending.
