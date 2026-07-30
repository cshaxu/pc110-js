# M2 T2 S6 P15 PCjs Change Report: Frame And Immediate Intervals

## Summary

- Affected PCjs-derived subsystem: verification-only CPUx86 differential oracle.
- Changed product behavior: none.

## Justification

- Rebuilt and PCjs RAM observations must both describe changed bytes.
- Generic programs add `60-61` and `68-6B` coverage without opcode-specific oracle code.

## Verification

- PUSHA/POPA and immediate PUSH/IMUL programs match every instruction boundary.
