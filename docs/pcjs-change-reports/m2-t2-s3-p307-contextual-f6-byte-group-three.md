# M2 T2 S3 P307: Contextual F6 Byte Group 3

## Summary

Route byte F6 Group 3 execution through the shared execution-size context.

## Basis

F6 operates on byte data regardless of the operand-size default, while 67
selects its ModR/M address width. NXVM defines the required byte Group 3
coverage; PCjs remains the PC/AT comparison source.

## Change

The project-owned contextual decoder now executes F6 TEST, NOT, NEG, MUL,
IMUL, DIV, and IDIV forms through existing state, fault, and memory boundaries.

## Verification

Focused execution coverage verifies register and 67-addressed memory forms in
a default-32 code segment. Existing byte Group 3 regressions remain green.

## Boundary

This part does not expand F6 instruction coverage, add device behavior, or
begin M2 T3.
