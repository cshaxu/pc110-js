# M2 T5 P78 Provenance

- Selected ROM evidence: at `F000:BD94`, the DeskPro BIOS sends keyboard
  command `0xF2` and waits for its IRQ1-driven completion flag.
- PCjs keyboard behavior: `0xEF` through `0xF2` are reserved NOP commands
  that acknowledge and retain their prior scanning state.
- Native gap: `AtKeyboard` previously emitted no byte for `0xF2`, leaving the
  selected ROM's wait uncompleted.
- Decision: emit only the standard `0xFA` ACK through the existing keyboard
  response queue. No device ID, BIOS data, or guest-memory result is invented.
