# M2 T2 S6 P18 PCjs Change Report: Group One Arithmetic

## Summary

- Affected PCjs-derived subsystem: verification-only CPUx86 differential oracle.
- Changed product behavior: none.

## Justification

- A generic immediate-register program extends Group One differential coverage.

## Verification

- ADD, ADC, SBB, SUB, and CMP forms in `80-83` match PCjs per instruction.
