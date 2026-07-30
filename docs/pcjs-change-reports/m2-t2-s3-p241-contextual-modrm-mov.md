# M2 T2 S3 P241: Contextual ModR/M MOV

## Summary

P241 routes the `89` and `8B` ModR/M MOV forms through the shared execution
context. It is the first memory operand family to honor both independently
selected execution widths.

## Basis

PCjs is the behavioral authority for selecting ModR/M address decoding and
operand data width per instruction. The Intel 80386 model requires CS D/B plus
66 to select operand width and CS D/B plus 67 to select address width.

## Change

The new slice decodes 16-bit or 32-bit ModR/M addressing from the context and
performs word or dword memory accesses from the same context. Existing segment
override, REP/REPNE, and LOCK dispatch boundaries are deliberately retained.

## Verification

Tests cover default-32 dword MOV, a 66-selected word MOV in default-32 code,
and a default-16 67-selected 32-bit address form. The test asserts memory data
width, effective address selection, register width, and instruction EIP.

## Boundaries

No other ModR/M, immediate, string, control-transfer, device, firmware, or
PC110 behavior is migrated by P241. No PCjs JavaScript or NXVM C code was
copied.
