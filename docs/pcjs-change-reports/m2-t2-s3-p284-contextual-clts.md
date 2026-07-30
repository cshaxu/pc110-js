# M2 T2 S3 P284: Contextual CLTS

## Summary

Route the existing `CLTS` instruction through the default-32 execution
context.

## Basis

PCjs remains the behavioral authority and Intel 80386 remains the semantic
requirement. CLTS clears CR0.TS at CPL zero; operand-size and address-size
prefixes do not alter its operation but remain part of the instruction stream.

## Change

The contextual two-byte dispatcher now applies the existing project-native
CPL-zero general-protection delivery before clearing CR0.TS. Successful
execution advances EIP by the prefix-aware opcode length.

## Verification

A default-32 protected-mode test executes operand-size-prefixed CLTS and
verifies CR0.TS is cleared and EIP includes the prefix. The full project gate
passes.

## Boundary

This part does not complete system-instruction coverage, task switching,
debug registers, paging integration, devices, firmware, PC110 behavior, or
M2 T3 work.
