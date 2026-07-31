# M2 T5 P82 PCjs Change Report: Opt-In 8042 Differential Probe

## Basis

The native TypeScript core reaches a real ROM keyboard-buffer wait, while a
bounded checkpoint run did not cross the assumed `F000:CEDB` path. The next
useful evidence is an ordered comparison of the 8042 transactions that actually
occur in both machines, not another firmware-specific timing change.

## PCjs Branch Change

Only the local `pc110` branch adds `pc110Probe=true` to the ChipSet
configuration. When enabled, the chip set retains its most recent 256 8042
transactions in `pc110ProbeEvents`. Each tuple contains sequence, operation,
port, value, caller address, status before, status after, output buffer, and
command byte.

## Boundary

The probe is disabled by default, has no PCjs main-branch change, and performs
no CPU, timer, IRQ, keyboard, BIOS, or device-state mutation. It is diagnostic
evidence for bounded replay and differential alignment only; it is not a
PC110JS runtime dependency or compatibility workaround.
