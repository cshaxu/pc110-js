# M2 T5 P98 Provenance

- CPU-only lockstep snapshots cannot distinguish an architectural CPU error
  from a selected PC/AT device state difference at an instruction boundary.
- The native core already owns reversible state for PIC, PIT, DMA, 8042, and
  RTC. This part exposes a minimal read-only, normalized observation subset
  from those existing boundaries.
- PCjs device-state export is deliberately separate and remains uncommitted
  until its one-page change report is implemented and verified.
