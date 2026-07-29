# M2 T2 S3 P227: 32-Bit Immediate IMUL

## Summary

This change adds operand-size-overridden `IMUL r32,r/m32,imm32` and
`IMUL r32,r/m32,imm8` (`66 69` and `66 6B`) for the existing 16-bit and 32-bit
ModR/M address paths.

## Basis

PCjs is the behavioral authority for M2. Its `opIMULn` and `opIMUL8` paths
define the signed immediate forms and set CF and OF when the signed product
does not fit the destination width. The local implementation uses `BigInt` to
make that 32-bit range decision exact rather than copying PCjs source.

## Scope And Risk

Only the two explicit-immediate, two-operand 32-bit forms are added. The
implementation changes CF and OF only, preserving the project's existing
handling of the architecturally undefined arithmetic flags. One-operand IMUL,
MUL, DIV, and IDIV remain separate work.

## Verification

The focused regression covers a positive overflow and a sign-extended byte
immediate product that exactly fits the signed 32-bit range. Full repository
format, build, lint, test, and diff gates run before commit.
