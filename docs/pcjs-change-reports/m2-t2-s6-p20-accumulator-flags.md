# M2 T2 S6 P20 PCjs Change Report: Accumulator And Flags

## Summary

- Affected PCjs-derived subsystem: verification-only CPUx86 differential oracle.
- Changed product behavior: none.

## Justification

- A generic program extends accumulator and flag-transfer coverage without a
  special oracle path.

## Verification

- NOP, accumulator XCHG, CBW/CWD, SAHF, and LAHF match PCjs per instruction.
