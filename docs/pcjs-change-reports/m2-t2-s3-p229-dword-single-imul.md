# M2 T2 S3 P229: Single-Operand 32-Bit IMUL

## Summary

This change adds operand-size-overridden single-operand `IMUL r/m32` (`66 F7 /5`).
It forms the signed 64-bit product of EAX and the source operand, then writes the
low and high halves to EAX and EDX.

## Basis

PCjs is the behavioral authority for M2. Its signed one-operand IMUL behavior
uses the implicit accumulator pair and reports overflow when the product cannot
be represented by the operand width. The local implementation uses exact
`BigInt` arithmetic and project-owned register and ModR/M boundaries.

## Scope And Risk

The implemented form currently uses the existing 16-bit ModR/M addressing path
under the operand-size override. CF and OF indicate whether the high half is the
sign extension of the low half. MUL, DIV, IDIV, and address-size override remain
separate work.

## Verification

The regression verifies a negative product in EDX:EAX that exactly fits the
signed 32-bit range, confirming CF and OF remain clear. Full repository gates
run before commit.
