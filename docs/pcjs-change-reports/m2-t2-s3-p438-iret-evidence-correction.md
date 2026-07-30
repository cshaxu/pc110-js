# M2 T2 S3 P438 PCjs Change Report: IRET Evidence Correction

## Summary

- Affected PCjs-derived subsystem: rebuilt IRET evidence boundary.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: none; an unreachable virtual-8086 guard was removed.
- Active milestone need: keep CPU completion evidence limited to executed paths.

## Justification

- Why configuration is insufficient: this is CPU decoding and evidence scope.
- Why a pc110-js adapter or profile wrapper is insufficient: no runtime adapter is involved.
- Evidence supporting the change: an operand-size-16 FLAGS read cannot contain EFLAGS.VM.
- Compatibility risk: none; reachable IRET behavior is unchanged.

## Implementation Boundary

- Source and destination files: rebuilt IRET and P437 evidence records.
- Mechanical migration separated from behavior change: no migration occurred.
- Generic PC/AT impact: removes a dead branch only.
- PC110-specific impact: none.

## Verification

- Focused tests: rebuilt interrupt suite.
- Unmodified PCjs comparison: not applicable.
- Generic PC/AT boot regression: retained by the full gate.
- PC110 regression, when established: not applicable.
- Manual browser result: not applicable.

## Future Path

- Reduction or revert strategy: none required.
- Possible upstream contribution: none.
- Deferred work: remaining protected-mode closure and later M2 T2 gates.
