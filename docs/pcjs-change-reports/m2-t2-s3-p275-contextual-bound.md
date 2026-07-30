# M2 T2 S3 P275: Contextual BOUND

## Summary

Route `62` through the project-native execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 operand-size selects the
signed index and lower/upper bound widths, while address-size selects the
ModR/M bounds-pair address. An out-of-range value delivers vector five from the
faulting instruction pointer.

## Change

The former dword-only BOUND helper now supports word or dword ranges through
the shared ModR/M decoder. The context dispatcher performs no copied PCjs code.

## Verification

Focused default-32 coverage verifies an unprefixed dword bounds pair and a
`66` and `67` prefixed word bounds pair, including successful EIP advance.
Existing real- and protected-mode vector-five fault tests remain green. The
full project gate passes.

## Boundary

This slice excludes segment overrides, other range-related instructions,
additional exception types, devices, firmware, PC110, and M2 T3 work.
