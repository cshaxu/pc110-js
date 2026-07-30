# M2 T2 S3 P287: Contextual Double Shifts

## Summary

Add 32-bit double-shift flag support and route SHLD/SHRD through the execution
context.

## Basis

PCjs remains the behavioral authority and Intel 80386 remains the semantic
requirement. Operand size selects word or dword data, address size selects the
ModR/M effective address, and count zero preserves flags.

## Change

The CPU state gains a 32-bit counterpart to the existing double-shift flag
writer. A project-native contextual helper handles immediate and CL counts,
register or memory operands, both data widths, and prefix-aware instruction
lengths.

## Verification

A default-32 protected-mode test performs dword SHLD, then operand-size-
overridden word SHRD. It verifies data width, carry-related flags, retained
high register bits, and EIP lengths. The full project gate passes.

## Boundary

This part does not complete all shift/rotate count edge cases, exception
behavior, paging integration, devices, firmware, PC110 behavior, or M2 T3
work.
