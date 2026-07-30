# M2 T2 S3 P261: Contextual Group 1 Immediate ALU

## Summary

Route ModR/M immediate ALU opcodes `81` and `83` through the project-native
execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 prefix semantics select the
non-default operand size with `66` and address size with `67`; immediate width
follows the selected operand form.

## Change

The Group 1 path now selects word or dword immediate data, 16-bit or 32-bit
ModR/M addressing, and sign-extended byte immediates from execution context.

## Verification

Focused default-32 tests cover dword `83`, `66` word behavior, `67` addressing,
instruction lengths, and memory width. The full project gate passes.

## Boundary

This slice excludes byte Group 1 migration, LOCK, segment overrides, devices,
firmware, PC110, and M2 T3 work.
