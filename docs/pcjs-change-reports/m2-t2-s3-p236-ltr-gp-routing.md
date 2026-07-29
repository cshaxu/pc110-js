# M2 T2 S3 P236: LTR #GP Routing

## Summary

- Affected PCjs-derived subsystem: protected task-register instruction dispatch.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: ring-3 `LTR` now delivers `#GP(0)` before descriptor access.
- Active milestone need: protected privilege behavior belongs to M2 S3.

## Justification

- Why configuration is insufficient: LTR privilege checking is CPU behavior.
- Why a pc110-js adapter or profile wrapper is insufficient: task-register
  semantics are generic 80386 architecture.
- Evidence supporting the change: P232 provides error-code delivery; existing
  LTR tests establish the project-native descriptor and task-register paths.
- Compatibility risk: successful CPL-zero LTR behavior remains unchanged.

## Implementation Boundary

- Source and destination files: PCjs-derived task behavior informed
  `src/cpu/x86/execution.ts` and focused tests.
- Mechanical migration separated from behavior change: no PCjs source is copied.
- Generic PC/AT impact: invalid ring-3 LTR cannot read descriptors or modify TR.
- PC110-specific impact: none.

## Verification

- Focused tests: ring-3 LTR enters vector 13 with a zero error code and leaves
  the task-register selector unchanged.
- Unmodified PCjs comparison: retained as the behavior authority; no source edit.
- Generic PC/AT boot regression: full repository gates run before commit.
- PC110 regression, when established: not applicable during generic M2 work.
- Manual browser result: not applicable to this CPU-only increment.

## Future Path

- Reduction or revert strategy: restore the direct LTR privilege rejection.
- Possible upstream contribution: none planned.
- Deferred work: selector validation failures and further task behavior remain S3.
