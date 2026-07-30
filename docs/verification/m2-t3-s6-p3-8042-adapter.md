# M2 T3 S6 P3 Verification: 8042 PC/AT Adapter

Focused tests cover `0x60`/`0x64` byte-width mapping, command response reads,
raw keyboard-byte IRQ1 delivery, no IRQ for controller replies, output-port
callbacks, reset-pulse callbacks, machine PIC integration, A20 effects, and
controller reset state. The required full quality gate remains required before
this part is committed.
