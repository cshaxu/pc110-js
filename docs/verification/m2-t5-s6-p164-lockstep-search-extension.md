# M2 T5 S6 P164 Lockstep Search Extension Verification

## Check

- The diagnostic batch remains 1,024 instructions.
- The reset-to-first-difference limit is 262,144 instructions.
- A mismatch still triggers ordinary cold reset, matched-prefix replay, and a
  single-step final batch rather than long trace retention.

## Boundary

This is the next bounded search for the unresolved native-browser versus M1
PCjs boot divergence after P163 matched the first 131,072 boundaries. It does
not alter emulation behavior or claim a DOS boot.
