# M2 T2 S3 P228: 32-Bit Two-Operand IMUL

## Summary

This change adds operand-size-overridden `IMUL r32,r/m32` (`66 0F AF`) for the
existing 16-bit and 32-bit ModR/M address paths.

## Basis

PCjs is the behavioral authority for M2. Its `opIMUL` path defines signed
two-operand multiplication and sets CF and OF when the signed product cannot
be represented in the destination width. The local implementation uses the
project-owned ModR/M and segmented-memory boundaries with exact `BigInt`
overflow classification rather than copying PCjs source.

## Scope And Risk

The implementation changes CF and OF only and preserves the existing handling
of architecturally undefined arithmetic flags. One-operand IMUL, MUL, DIV, and
IDIV remain separate work.

## Verification

The regression covers a register overflow and a 32-bit-addressed memory source
that fits the signed 32-bit destination range. Full repository gates run before
commit.
