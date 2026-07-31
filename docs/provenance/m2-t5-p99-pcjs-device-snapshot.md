# M2 T5 P99 Provenance

- P98 established the project-native selected-device observation contract.
- The PCjs `pc110` branch now exposes equivalent read-only PIC, PIT, DMA,
  8042, and RTC observations through the existing opt-in lockstep control.
- The export reads existing PCjs state only; it does not affect normal device
  execution, timing, interrupts, input, reset, or product runtime ownership.
