# M2 T2 S3 P263: Contextual Byte Group 1 Immediate ALU

## Summary

Route byte Group 1 immediate opcode `80` through the project-native execution
context.

## Basis

PCjs remains the behavioral authority. Intel 80386 address-size prefix behavior
selects the non-default ModR/M address form independently of byte data width.

## Change

The byte Group 1 extension now selects shared arithmetic, logic, and comparison
behavior while context selects 16-bit or 32-bit effective-address decoding.

## Verification

A focused default-32 `67 80 /0 ib` test verifies address selection, byte memory
write, immediate length, and EIP. The complete project gate passes.

## Boundary

This slice excludes opcode `82`, segment overrides, LOCK semantics, devices,
firmware, PC110, and M2 T3 work.
