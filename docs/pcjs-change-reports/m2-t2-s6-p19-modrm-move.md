# M2 T2 S6 P19 PCjs Change Report: ModR/M Move Slice

## Summary

- Affected PCjs-derived subsystem: verification-only CPUx86 differential oracle.
- Changed product behavior: none.

## Justification

- A generic program extends `84-8D` validation without per-opcode oracle logic.

## Verification

- TEST, XCHG, both general MOV forms, and LEA match PCjs per instruction.
