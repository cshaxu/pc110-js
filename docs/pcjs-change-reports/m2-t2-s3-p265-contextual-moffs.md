# M2 T2 S3 P265: Contextual Accumulator Moffs

## Summary

Route accumulator moffs opcodes `A0` through `A3` through the project-native
execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 operand-size and address-size
semantics independently select moffs data and offset-immediate widths.

## Change

Byte moffs forms retain byte data width; `A1` and `A3` select word or dword
data width from context. Every form selects a 16-bit or 32-bit offset immediate
from context address size.

## Verification

Focused default-32 tests verify dword load, `66` word store, 32-bit offset
length, memory data width, and EIP. The complete project gate passes.

## Boundary

This slice excludes segment overrides, devices, firmware, PC110, and M2 T3.
