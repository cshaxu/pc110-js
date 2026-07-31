# M2 T5 P137 PCjs Change Report: 8042 Command-Byte History

## Basis

The native browser reaches a keyboard wait with command byte `0x5D`, while a
same-media PCjs run continues with command byte `0x45`. The bounded transaction
tail loses earlier transitions during a normal full-speed run.

## Change

Only the local PCjs `pc110` branch adds an opt-in, 64-entry history of changed
8042 command bytes. Each entry records sequence, previous/current byte, status,
and output latch. The PC110JS diagnostic page renders that read-only history.

## Boundaries

The probe is disabled unless `pc110Probe` is set. It does not alter CPU, timer,
PIC, keyboard, ROM, I/O, reset, or normal PCjs behavior. It is diagnostic-only
and PC110JS does not depend on it at runtime.
