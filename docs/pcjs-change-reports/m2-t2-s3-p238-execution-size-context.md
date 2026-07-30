# M2 T2 S3 P238: Execution-Size Context

## Summary

- Affected PCjs-derived subsystem: 80386 instruction decode and execution width selection.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: records the approved replacement of prefix-special-case
  dispatch with CS-default per-instruction operand and address-size selection.
- Active milestone need: ordinary 32-bit protected-mode execution is required
  for the generic M2 80386 machine.

## Justification

- Why configuration is insufficient: CS and SS hidden-cache width attributes
  are architectural CPU state, not machine-profile configuration.
- Why a pc110-js adapter or profile wrapper is insufficient: operand, address,
  and stack width behavior is generic 80386 semantics.
- Evidence supporting the change: PCjs uses per-instruction `sizeData` and
  `sizeAddr` behavior; Intel 80386 semantics require the CS D/B default and
  non-cumulative `66` and `67` selection.
- Compatibility risk: prefix order, stack width, fault EIP, and existing
  16-bit paths can regress without incremental context and migration tests.

## Implementation Boundary

- Source and destination files: PCjs CPU decode behavior informs project-native
  TypeScript execution context and incremental `src/cpu/x86/` migration.
- Mechanical migration separated from behavior change: no PCjs JavaScript or
  NXVM C code is copied; NXVM informs structure only.
- Generic PC/AT impact: default 16-bit and default 32-bit protected code select
  the correct operand and address widths independently from stack width.
- PC110-specific impact: none.

## Verification

- Focused tests: context defaults, `66`, `67`, repeated prefixes, SS width,
  instruction length, fault EIP, and each migrated family.
- Unmodified PCjs comparison: PCjs remains read-only behavior authority.
- Generic PC/AT boot regression: the selected local ROM trace remains required.
- PC110 regression, when established: not applicable during generic M2 work.
- Manual browser result: deferred until a standalone M2 browser machine exists.

## Future Path

- Reduction or revert strategy: retain existing verified families while removing
  context migration one family at a time if a focused regression fails.
- Possible upstream contribution: none planned.
- Deferred work: unimplemented 80386 families and all hardware work remain in
  their existing M2 subtasks.
