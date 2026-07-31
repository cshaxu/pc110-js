# M2 T5 P88 PCjs Change Report: 8042 Reset Status Alignment

## Basis

The first effective PCjs probe showed the selected ROM reads `0x10` from port
`0x64` before its `0xAA` controller test. The native controller returned zero,
although both retained the same `0x10` command byte.

## Change

The project-native 8042 now tracks the status-only keyboard-inhibit signal
separately from its command byte. The selected default reports the PCjs reset
state and preserves that state through capture/restore.

## Boundary

No PCjs source changed. This does not add a lock input, BIOS response, guest
service, timing shortcut, or keyboard byte; a future physical lock model is
recorded as `TODO(High)`.
