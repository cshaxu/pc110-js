# M2 T2 S3 P235: POPF And POPFD #GP Routing

## Summary

- Affected PCjs-derived subsystem: protected EFLAGS stack operations.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: ring-3 `POPF` and `POPFD` deliver `#GP(0)` before stack access.
- Active milestone need: protected privilege behavior belongs to M2 S3.

## Justification

- Why configuration is insufficient: stack ordering and privilege faults are CPU behavior.
- Why a pc110-js adapter or profile wrapper is insufficient: POPF semantics are
  generic 80386 behavior.
- Evidence supporting the change: P232 established the error-code frame path;
  existing POPF/POPFD tests establish the project stack boundary.
- Compatibility risk: successful CPL-zero behavior remains unchanged.

## Implementation Boundary

- Source and destination files: PCjs-derived flags-stack behavior informed
  `src/cpu/x86/execution.ts` and focused tests.
- Mechanical migration separated from behavior change: no PCjs source is copied.
- Generic PC/AT impact: failed ring-3 operations preserve their pre-fault stack.
- PC110-specific impact: none.

## Verification

- Focused tests: both operand widths deliver vector 13 and preserve the original
  four stack bytes while creating the error-code frame.
- Unmodified PCjs comparison: retained as the behavior authority; no source edit.
- Generic PC/AT boot regression: full repository gates run before commit.
- PC110 regression, when established: not applicable during generic M2 work.
- Manual browser result: not applicable to this CPU-only increment.

## Future Path

- Reduction or revert strategy: restore direct privilege rejection branches.
- Possible upstream contribution: none planned.
- Deferred work: more protected privilege and error-code sources remain S3 work.
