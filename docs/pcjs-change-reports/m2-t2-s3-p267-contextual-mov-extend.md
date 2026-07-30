# M2 T2 S3 P267: Contextual MOVZX And MOVSX

## Summary

Route `0F B6/B7/BE/BF` through the project-native execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 operand-size selects the
MOVZX/MOVSX destination width, while address-size selects the ModR/M source
address. The source byte or word width remains opcode-defined.

## Change

The former dword-only helper now selects word or dword destination width. The
context dispatcher handles the two-byte opcode path without copied PCjs code.

## Verification

Focused default-32 tests cover a sign-extended byte through 32-bit addressing
and a `66` word destination through the same address form, including source,
destination, instruction length, and EIP. Existing dword fixtures now state the
correct 16-bit-default plus `66` intent. The full project gate passes.

## Boundary

This slice excludes other two-byte opcode families, segment overrides, devices,
firmware, PC110, and M2 T3 work.
