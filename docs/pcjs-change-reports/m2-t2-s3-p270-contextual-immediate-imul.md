# M2 T2 S3 P270: Contextual Immediate IMUL

## Summary

Route `69` and `6B` through the project-native execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 operand-size selects the
signed source, destination, and `69` immediate width; `6B` always carries a
signed byte immediate. Address-size selects the ModR/M effective-address form.

## Change

The former dword-only helper now performs word or dword immediate IMUL through
one project-native path. The context dispatcher handles both opcodes without
copied PCjs code.

## Verification

Focused default-32 coverage verifies an unprefixed dword immediate form and a
`66` and `67` prefixed word memory form, including high-half preservation and
EIP. Existing dword fixtures now state the correct default-32 no-prefix form.
The full project gate passes.

## Boundary

This slice excludes one-operand multiply/divide forms, other arithmetic
families, segment overrides, devices, firmware, PC110, and M2 T3 work.
