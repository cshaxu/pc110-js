# M2 T2 S3 P259: Contextual ModR/M ALU

## Summary

Route the implemented word and dword ModR/M ALU forms through the project-native
per-instruction execution context.

## Basis

The pinned PCjs CPU source selects default operand and address sizes from the
current code-segment D/B attribute. Intel 80386 prefix semantics make `66` and
`67` select the non-default operand and address sizes. PCjs is the behavioral
authority; no PCjs or NXVM implementation was copied.

## Change

The common ALU mapping now selects word or dword data width and 16-bit or
32-bit ModR/M addressing from the context. The word helper now shares the
implemented dword operation set and flag behavior. Legacy dword fixture code
segments are explicitly 16-bit-default where `66` intends dword behavior.

## Verification

Focused execution tests cover default-32 dword operation, default-32 `66` word
operation, `67` 16-bit ModR/M addressing, register width preservation, memory
width, and instruction length. The full project gate passes.

## Boundary

This slice excludes byte ALU migration, immediate groups, LOCK semantics,
segment overrides, paging changes, devices, firmware, PC110, and M2 T3 work.
