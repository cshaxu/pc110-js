# M2 T2 S3 P262: Contextual Byte ModR/M ALU

## Summary

Route implemented byte ModR/M ALU forms through the project-native execution
context.

## Basis

PCjs remains the behavioral authority. Intel 80386 `67` semantics select the
non-default address size independently of byte operand width.

## Change

Byte ALU forms now share context-selected ModR/M addressing and existing byte
flag behavior. Arithmetic, logic, compare, and test writes retain their prior
destination and non-writing contracts.

## Verification

A focused default-32 `67` byte-memory ALU test verifies 16-bit addressing,
memory write, and instruction length. The complete project gate passes.

## Boundary

This slice excludes immediate byte groups, segment overrides, LOCK semantics,
devices, firmware, PC110, and M2 T3 work.
