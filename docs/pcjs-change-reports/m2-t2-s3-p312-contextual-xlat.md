# M2 T2 S3 P312: Contextual XLAT

## Summary

Route XLAT through the shared execution-size context.

## Basis

Intel IA-32 uses the address size to select BX or EBX for XLAT table indexing;
AL remains an 8-bit index and result. NXVM includes XLAT coverage. PCjs
remains the PC/AT comparison source.

## Change

The project-owned contextual decoder now executes XLAT with the
context-selected DS table offset and preserves byte accumulator behavior.

## Verification

Focused coverage verifies default-32 EBX and 67-selected BX table lookups.
The full project gate passes.

## Boundary

This part does not alter segment overrides, other string instructions,
hardware, or M2 T3 work.
