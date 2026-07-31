# M2 T5 P116 PCjs Change Report: PIT Timing Observation

## Basis

A stable controlled replay first differs only in primary PIT channel one at
`F000:BB13`: the native count is `17` while the PCjs count is `18`.

## Change

The opt-in paused lockstep snapshot exports read-only timer timing fields:
the chipset tick divisor, the CPU cycle count used by timer calculations, and
each primary PIT timer's start cycle and counting state.

## Boundaries

The fields copy existing values only. They do not call timer update methods,
change normal scheduling, alter interrupts, or affect non-diagnostic PCjs
machines.

## Verification And Rollback

The same-media replay must expose the fields at the existing first difference.
Removing the fields restores the prior diagnostic payload without changing
PCjs execution.
