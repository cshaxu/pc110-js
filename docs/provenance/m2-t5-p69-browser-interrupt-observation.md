# M2 T5 P69 Provenance

- Trigger: browser evidence showed a persistent IRQ1 request at the BIOS
  keyboard-read boundary, but the existing readout omitted PIC masks and the
  native keyboard scan-line state.
- Contract: the development-only native status readout now exposes existing
  project-native PIC masks and the keyboard scan-admission state.
- Boundary: this is observational UI only. It changes no CPU, PIC, 8042,
  keyboard, timing, firmware, or browser-input behavior.
