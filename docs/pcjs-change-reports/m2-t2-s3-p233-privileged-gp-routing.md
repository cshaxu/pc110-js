# M2 T2 S3 P233: Privileged #GP Routing

## Summary

- Affected PCjs-derived subsystem: protected 80386 privileged instruction checks.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: nonzero-CPL `CLTS` and `MOV CRn` now deliver `#GP(0)`.
- Active milestone need: generic protected-mode CPU behavior belongs to M2 S3.

## Justification

- Why configuration is insufficient: privilege enforcement is CPU behavior.
- Why a pc110-js adapter or profile wrapper is insufficient: CR access and CLTS
  are generic 80386 instructions, not platform policy.
- Evidence supporting the change: P232 provides the verified project-native
  protected error-code frame boundary; PCjs remains the behavior authority.
- Compatibility risk: successful CPL-zero execution paths remain unchanged.

## Implementation Boundary

- Source and destination files: PCjs-derived privileged behavior informed
  `src/cpu/x86/execution.ts` and focused tests.
- Mechanical migration separated from behavior change: no PCjs source is copied.
- Generic PC/AT impact: invalid ring-3 attempts fault without mutating CR0.
- PC110-specific impact: none.

## Verification

- Focused tests: ring-3 `CLTS` and `MOV CR0,EAX` retain CR0 and enter vector 13
  with an error code of zero.
- Unmodified PCjs comparison: retained as the behavior authority; no source edit.
- Generic PC/AT boot regression: full repository gates run before commit.
- PC110 regression, when established: not applicable during generic M2 work.
- Manual browser result: not applicable to this CPU-only increment.

## Future Path

- Reduction or revert strategy: restore the two direct rejection branches.
- Possible upstream contribution: none planned.
- Deferred work: remaining privileged and selector-derived error-code paths stay
  within S3 and require separate frame-safety reviews.
