# M2 T2 S3 P283: Contextual Control Registers

## Summary

Route existing CR0, CR2, and CR3 MOV forms through the default-32 execution
context.

## Basis

PCjs remains the behavioral authority and Intel 80386 remains the semantic
requirement. `0F 20` and `0F 22` transfer fixed 32-bit control-register data;
operand-size and address-size prefixes do not change their data width.

## Change

The contextual two-byte opcode dispatcher now performs the existing
project-native control-register transfer and CPL-zero fault check. It retains
the established noncanonical ModR/M compatibility behavior and CR3 state
normalization.

## Verification

A default-32 protected-mode test moves CR2 into EAX, then moves EAX into CR3
with an operand-size prefix. It verifies fixed 32-bit transfer semantics,
CR3 normalization, and prefix-inclusive EIP length. The full project gate
passes.

## Boundary

This part does not complete CR0 side effects, debug registers, paging
integration, system instruction validation, devices, firmware, PC110 behavior,
or M2 T3 work.
