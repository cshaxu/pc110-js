# M2 T2 S3 P234: Default LODSW

## Summary

- Affected PCjs-derived subsystem: 16-bit string instruction execution.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: adds unprefixed `LODSW` through DS:SI.
- Active milestone need: generic 80386 string behavior belongs to M2 S3.

## Justification

- Why configuration is insufficient: string operand and direction semantics are CPU behavior.
- Why a pc110-js adapter or profile wrapper is insufficient: `LODSW` is generic
  x86 behavior, not machine-specific policy.
- Evidence supporting the change: PCjs remains the M2 behavior authority; the
  existing `LODSB` and CS-overridden `LODSW` establish local string boundaries.
- Compatibility risk: the new unprefixed opcode does not alter prefix handling.

## Implementation Boundary

- Source and destination files: PCjs-derived string behavior informed
  `src/cpu/x86/execution.ts` and focused tests.
- Mechanical migration separated from behavior change: no PCjs source is copied.
- Generic PC/AT impact: AX loads from DS:SI and SI advances or retreats by two.
- PC110-specific impact: none.

## Verification

- Focused tests: a DS-based backward word load verifies AX and SI updates.
- Unmodified PCjs comparison: retained as the behavior authority; no source edit.
- Generic PC/AT boot regression: full repository gates run before commit.
- PC110 regression, when established: not applicable during generic M2 work.
- Manual browser result: not applicable to this CPU-only increment.

## Future Path

- Reduction or revert strategy: remove the unprefixed `0xAD` dispatch case.
- Possible upstream contribution: none planned.
- Deferred work: broader operand/address-size string forms and string I/O remain
  separately scoped CPU and I/O work.
