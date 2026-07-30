# M2 T2 S3 P305: Contextual F7 Group 3

## Summary

Route word and dword F7 Group 3 execution through the shared execution-size
context.

## Basis

Intel IA-32 defines the current CS D/B attribute as the default operand and
address size, with 66 and 67 independently selecting the non-default sizes.
NXVM's F7 handlers define the required Group 3 operation coverage. PCjs
remains the PC/AT and whole-machine comparison source.

## Change

The project-owned decoder now calls contextual word or dword F7 helpers for
TEST, NOT, NEG, MUL, IMUL, DIV, and IDIV. The helpers share the existing
project-native state, flag, exception, and memory boundaries while decoding
ModR/M addresses at the context-selected width.

Historical tests that treated 66 as a dword selector in a default-32 code
segment now correctly use a default-16 code segment. The 32-bit-address TEST
fixture now includes a valid ModR/M address and immediate encoding.

## Verification

Focused execution tests cover a default-32 dword F7 form, a 66-selected word
form, and 66 plus 67 memory access. Existing signed arithmetic, divide-fault,
and address-size Group 3 tests remain green. The full project gate passes.

## Boundary

This part does not add F6 byte contextual migration, expand Group 3 coverage,
add paging or device behavior, or begin M2 T3.
