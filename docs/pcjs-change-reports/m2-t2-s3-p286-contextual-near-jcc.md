# M2 T2 S3 P286: Contextual Near Conditional Jumps

## Summary

Route `0F 80` through `0F 8F` near conditional jumps through the shared
execution context.

## Basis

PCjs remains the behavioral authority and Intel 80386 remains the semantic
requirement. Operand size selects the near displacement and destination IP/EIP
width; the condition code remains based on EFLAGS.

## Change

The contextual two-byte dispatcher reads the operand-size-selected
displacement, preserves the existing condition predicate, and updates IP or
EIP with a prefix-aware instruction length.

## Verification

A default-32 protected-mode test takes a 32-bit JZ and then skips an
operand-size-overridden 16-bit JNZ. It verifies both target widths and exact
instruction lengths. The full project gate passes.

## Boundary

This part does not complete all control-transfer, privilege, gate, exception,
paging, device, firmware, PC110, or M2 T3 behavior.
