# M2 T2 S3 P273: Contextual PUSH r/m

## Summary

Route `FF /6` through the project-native execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 operand-size selects pushed
data width, address-size selects a ModR/M memory source, and the SS D/B
attribute selects stack pointer width. The source is read before the stack
pointer is decremented.

## Change

The context dispatcher reuses the existing context-aware stack boundary and
adds a project-native `PUSH r/m` helper. It uses shared ModR/M decoding without
copied PCjs code.

## Verification

Focused default-32 coverage verifies a dword memory source and a `66` and `67`
word memory source, including stack bytes, ESP, and EIP. The full project gate
passes.

## Boundary

This slice excludes segment overrides, other `FF` suboperations, other stack
instructions, devices, firmware, PC110, and M2 T3 work.
