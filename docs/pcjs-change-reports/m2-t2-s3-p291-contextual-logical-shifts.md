# M2 T2 S3 P291: Contextual Logical Shifts

## Summary

Add 32-bit logical-shift flag support and route Group 2 SHL/SHR forms through
the execution context.

## Basis

PCjs remains the behavioral authority and Intel 80386 remains the semantic
requirement. Operand size selects word or dword data, address size selects the
ModR/M effective address, and the count source is one, CL, or an immediate.

## Change

The CPU state gains 32-bit counterparts to existing SHL/SHR flag writers. The
contextual dispatcher handles Group 2 `/4` and `/5` for `C1`, `D1`, and `D3`.
Other Group 2 subfunctions deliberately retain their existing dispatch.

## Verification

A default-32 test performs immediate dword SHL, operand-size-overridden word
SHR, and CL-counted dword SHR. It verifies data widths, preserved high word,
and EIP lengths. Existing rotate regressions remain green. The full project
gate passes.

## Boundary

This part excludes Group 2 rotations, SAR, byte forms, complete count-edge
behavior, paging integration, devices, firmware, PC110 behavior, and M2 T3
work.
