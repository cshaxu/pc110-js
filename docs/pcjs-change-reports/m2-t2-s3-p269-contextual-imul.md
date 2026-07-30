# M2 T2 S3 P269: Contextual Two-Operand IMUL

## Summary

Route `0F AF` through the project-native execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 operand-size selects the
signed source and destination width, while address-size selects the ModR/M
effective-address form. CF and OF indicate whether the signed result fits in
the selected destination width.

## Change

The former dword-only helper now performs word or dword multiplication through
one project-native path. The context dispatcher handles the two-byte opcode
without copied PCjs code.

## Verification

Focused default-32 coverage verifies an unprefixed dword register form and a
`66` and `67` prefixed word memory form, including high-half preservation and
EIP. Existing dword memory coverage now uses the correct default-32 no-prefix
form. The full project gate passes.

## Boundary

This slice excludes immediate IMUL forms, other multiply/divide opcodes,
segment overrides, devices, firmware, PC110, and M2 T3 work.
