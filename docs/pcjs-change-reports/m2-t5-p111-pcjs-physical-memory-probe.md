# M2 T5 P111 PCjs Change Report: Physical Memory Probe

## Basis

The paused reset control repeatedly reaches a ROM option-slot scan, but soft
reset replay has produced conflicting `C8000` and `E0000` observations. The
existing CPU and device snapshot cannot distinguish retained PCjs memory state
from a project-native mapping error.

## Change

On the isolated PCjs `pc110` branch, add two direct physical byte reads to the
opt-in `pc110Lockstep` snapshot: `0xC8000` and `0xE0000`. The probe calls the
existing bus direct-read API only while a diagnostic snapshot is requested.

## Boundaries

The change does not alter instruction dispatch, memory maps, reset order,
timers, devices, media, or normal PCjs behavior. It is inactive unless the
existing `pc110Lockstep` option is enabled, and PC110JS uses it only for
diagnosis.

## Verification And Rollback

Verify that repeated paused reset snapshots expose both values and that the
controlled browser replay remains usable. Revert the two snapshot fields and
their mirrored uncompiled-bundle lines to remove the probe completely.
