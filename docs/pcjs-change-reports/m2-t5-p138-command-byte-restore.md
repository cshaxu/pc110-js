# M2 T5 P138 PCjs Change Report: 8042 Restore Transition

## Basis

The P137 recorder observes normal `set8042CmdData()` writes, but the PCjs
DeskPro reference restores its initial 8042 state through `restore()`. That
direct assignment bypassed the recorder, leaving an empty history despite the
observable `0x10` to `0x45` state boundary.

## Change

The local PCjs `pc110` branch records the old and restored command bytes before
the existing direct restore assignment. The same bounded, opt-in recorder is
used; runtime behavior remains unchanged.

## Boundaries

This is diagnostic-only and active only with `pc110Probe`. It does not alter
PCjs CPU, timers, PIC, keyboard delivery, firmware, I/O semantics, or normal
PCjs distribution behavior.
