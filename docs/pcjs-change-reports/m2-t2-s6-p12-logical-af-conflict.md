# M2 T2 S6 P12 PCjs Change Report: Logical AF Conflict

## Summary

- Affected PCjs-derived subsystem: verification-only CPUx86 differential
  oracle.
- Changed product behavior: none.

## Justification

- A generic byte-stream program exposed an undefined logical-AF difference.
- NXVM preserves AF for logical operations; the rebuilt CPU follows that rule.

## Verification

- The real-mode `AND AX, 00FFh` fixture differs only in AF after the logical
  operation: rebuilt `0x12`, PCjs `0x02`.
- No product behavior changed. The owner must decide whether to approve a
  scoped exception or change the governing flag policy.
