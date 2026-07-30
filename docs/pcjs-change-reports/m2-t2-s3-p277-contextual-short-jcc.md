# M2 T2 S3 P277: Contextual Short Jcc

## Summary

Route `70` through `7F` through the project-native execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 short conditional jumps use
a signed byte displacement, but operand-size selects whether the target updates
IP or EIP. The condition remains determined by EFLAGS.

## Change

The context dispatcher applies the existing condition mapping and writes an
IP- or EIP-width target without copied PCjs code.

## Verification

Focused default-32 coverage verifies a target above `0xFFFF`, followed by a
`66` target that wraps to 16-bit IP. The full project gate passes.

## Boundary

This slice excludes LOOP-family control flow, near and far transfers, prefix
interactions beyond operand-size, devices, firmware, PC110, and M2 T3 work.
