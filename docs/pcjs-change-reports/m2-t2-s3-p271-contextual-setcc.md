# M2 T2 S3 P271: Contextual SETcc

## Summary

Route `0F 90` through `0F 9F` through the project-native execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 SETcc writes a byte selected
by the condition-code flags. The operand width is fixed at one byte; address
size selects only the ModR/M effective-address form.

## Change

The context dispatcher calls one project-native helper for all SETcc condition
codes. It uses the shared ModR/M decoder and byte segment access without copied
PCjs code.

## Verification

Focused default-32 coverage verifies an unprefixed dword-addressed memory
destination and a `67` 16-bit-addressed memory destination, including written
values and EIP. The full project gate passes.

## Boundary

This slice excludes segment overrides, LOCK, other two-byte opcode families,
devices, firmware, PC110, and M2 T3 work.
