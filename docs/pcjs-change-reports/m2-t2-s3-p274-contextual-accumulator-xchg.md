# M2 T2 S3 P274: Contextual Accumulator XCHG

## Summary

Route `91` through `97` through the project-native execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 operand-size selects AX or
EAX and the matching selected register width. This register-only exchange does
not alter flags.

## Change

The context dispatcher exchanges word or dword register values directly,
without copied PCjs code.

## Verification

Focused default-32 coverage verifies an unprefixed dword exchange followed by
a `66` word exchange, including high-half preservation and EIP. The full
project gate passes.

## Boundary

This slice excludes ModR/M XCHG extensions, segment overrides, devices,
firmware, PC110, and M2 T3 work.
