# M2 T5 P98 PCjs Change Report: Selected Device Snapshot

## Basis

CPU-only snapshots cannot locate a whole-machine divergence when an interrupt,
timer, DMA request, keyboard-controller response, or RTC state differs before
the next decoded instruction. Both implementations already retain the selected
PC/AT device state needed for the active ROM path.

## Change

Extend only the opt-in PCjs `pc110Lockstep` snapshot with copies of selected
observable PIC, PIT, DMA, 8042, and RTC state. The fields are read-only and
bounded; no device state, timer schedule, interrupt request, input queue, or
normal PCjs behavior is changed.

## Boundaries

The change is local to the PCjs `pc110` branch and active only when
`pc110Lockstep=true`. It is a diagnostic comparison surface, not a product
dependency or device replacement. FDC, storage, video, serial, memory write
sets, and complete event journals remain later, evidence-driven additions.
