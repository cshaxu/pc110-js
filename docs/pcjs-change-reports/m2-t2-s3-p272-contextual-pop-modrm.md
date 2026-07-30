# M2 T2 S3 P272: Contextual POP r/m

## Summary

Route `8F /0` through the project-native execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 operand-size selects the
popped data width, address-size selects the ModR/M destination address, and
the SS D/B attribute selects the stack pointer width. A memory destination is
addressed after the stack pointer has advanced.

## Change

The context dispatcher reuses the existing context-aware stack boundary and
adds a project-native `POP r/m` helper. It uses shared ModR/M decoding without
copied PCjs code.

## Verification

Focused default-32 coverage verifies a dword memory destination, then a `66`
and `67` word memory destination. A separate case verifies a dword POP with a
16-bit SS stack pointer while CS remains 32-bit. The full project gate passes.

## Boundary

This slice excludes segment overrides, POP segment registers, other stack
instructions, devices, firmware, PC110, and M2 T3 work.
