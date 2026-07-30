# M2 T2 S6 P16 PCjs Change Report: String I/O

## Summary

- Affected PCjs-derived subsystem: verification-only CPUx86 differential oracle.
- Changed product behavior: none.

## Justification

- String I/O must be compared through the generic dispatcher and journal.

## Verification

- A declared-port real-mode INSB/OUTSB program matches PCjs state, RAM, and I/O.
