# M2 T5 P88 Provenance

- PCjs initializes the DeskPro 8042 status with `NO_INHIBIT` set (`0x10`) while
  its command byte remains `NO_CLOCK` (`0x10`); the two registers are distinct.
- The native model incorrectly derived status bit `0x10` from the command byte,
  producing reset status `0x00`.
- The correction preserves a separate snapshot-restorable keyboard-inhibit
  state. The current selected PC/AT profile has no lock input, so reset leaves
  it clear and exposes `NO_INHIBIT`.
