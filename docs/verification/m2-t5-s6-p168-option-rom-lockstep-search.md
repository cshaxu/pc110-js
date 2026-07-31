# M2 T5 S6 P168 Option-ROM Lockstep Search Verification

## Check

- The existing cold diagnostic batch remains 1,024 instructions.
- The one-time reset-to-first-difference limit is 1,000,000 instructions.
- A mismatch still resets both endpoints, replays only the matched prefix, and
  single-steps the final mismatched batch.

## Boundary

P158 recorded the project-native one-million-instruction checkpoint at IBM VGA
option-ROM execution. This part permits one governed cold PCjs comparison to
that known boundary. It changes no emulation behavior and makes no DOS claim.
