# M2 T2 S6 P14 PCjs Change Report: Numeric Program Intervals

## Summary

- Affected PCjs-derived subsystem: verification-only CPUx86 differential oracle.
- Changed product behavior: none.

## Justification

- Numeric byte-stream programs extend S6 coverage without per-opcode oracle code.

## Verification

- Passing programs cover selected `00-3F` arithmetic, complete `40-5F`, and
  complete real-mode `B0-BF` instruction sequences.
