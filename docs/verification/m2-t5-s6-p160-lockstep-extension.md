# M2 T5 S6 P160 Lockstep Extension Verification

## Check

- A cold selected-media session first matched 65,536 native-versus-PCjs
  instruction boundaries in 64 batches.
- The same paused endpoints then advanced one further 1,024-instruction batch.
- That batch matched at both boundaries and consumed 4,441 virtual cycles on
  each endpoint.

## Boundary

This extends the established cold lockstep baseline by one bounded batch. It
does not claim DOS boot, complete device-state equivalence, or a replacement
for a first-difference replay when a later batch diverges.
