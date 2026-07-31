# M2 T5 P94 PCjs Change Report: Normalized CPU Snapshot

## Basis

P91 proved that the local PCjs `pc110` branch can execute one paused ordinary
instruction-budget operation. P93 now exposes the project-native CPU state and
virtual cycle counter at the same diagnostic boundary. The current PCjs
snapshot contains only a small display-oriented subset, so it cannot identify
the first architectural difference after a matched instruction.

## Change

Extend the opt-in `pc110Lockstep` snapshot in PCjs's ChipSet diagnostic control
with existing CPU general-register, flags, segment-cache, control-register,
debug-register, and descriptor-table state. The control exposes copies of
state only; it neither writes CPU state nor changes PCjs instruction, timer,
interrupt, device, reset, or browser behavior.

## Boundaries

The change applies only to the local PCjs `pc110` branch when
`pc110Lockstep=true`. It is a diagnostic oracle surface, not a PC110 hardware
implementation or PC110JS runtime dependency. Memory write sets, I/O and
interrupt journals, device snapshots, equivalent reset construction, and a
cross-machine coordinator remain later parts.
