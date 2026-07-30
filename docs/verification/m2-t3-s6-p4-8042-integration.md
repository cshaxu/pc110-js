# M2 T3 S6 P4 Verification: 8042 Integration

Focused rebuilt-machine tests cover `0x60`/`0x64` composition, command-byte
keyboard admission, PIC IRQ1, output-buffer consumption, output-port A20,
self-test `0x55`, and reset keyboard-disable state. `pnpm run trace:rebuilt-rom`
executed two instructions to `F000:F907` and stopped at the unrelated unclaimed
`0x84` write. The full quality gate remains required before this part is
committed.
