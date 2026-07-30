# M2 T2 S3 P285: Contextual FS/GS Stack Transfers

## Summary

Route `PUSH FS`, `POP FS`, `PUSH GS`, and `POP GS` through the shared
execution context.

## Basis

PCjs remains the behavioral authority and Intel 80386 remains the semantic
requirement. Operand size selects the stack data width, while SS D/B selects
the stack-address width. FS and GS selector loads retain normal real- or
protected-mode segment validation.

## Change

The contextual two-byte dispatcher uses the existing context stack primitives
for FS/GS selector transfers, then delegates POP segment loading to the
existing segment loader. Prefix-aware EIP advancement is shared with the other
two-byte contextual paths.

## Verification

A default-32 protected-mode test pushes FS as a dword through a 32-bit SS
stack, then operand-size-prefixed POP GS consumes a word. It verifies stored
bytes, independent ESP increments, protected-mode GS descriptor loading, and
EIP lengths. The full project gate passes.

## Boundary

This part does not complete segment-load faults, task switching, system
instruction coverage, paging integration, devices, firmware, PC110 behavior,
or M2 T3 work.
