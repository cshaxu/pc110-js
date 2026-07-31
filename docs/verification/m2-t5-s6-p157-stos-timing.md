# M2 T5 S6 P157 STOS Timing Verification

## Focused Checks

- Non-REP operand-sized STOS charges three cycles, including the `66 AB`
  STOSD form selected by the ROM.
- REP first and continuation STOS charges remain seven and three cycles.
- The full quality gate passes. A cold same-media browser lockstep search
  matches 65,536 instruction boundaries in 64 batches with no architectural or
  timing difference.

## Boundary

This changes only generic STOS scheduling. It does not add firmware, device,
or DOS shortcut behavior.
