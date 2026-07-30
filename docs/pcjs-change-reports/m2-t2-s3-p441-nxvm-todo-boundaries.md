# M2 T2 S3 P441 PCjs Change Report: NXVM TODO Boundaries

## Summary

- Affected PCjs-derived subsystem: rebuilt protected control-transfer boundaries.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: none; source comments and evidence now identify deferred NXVM TODO paths.
- Active milestone need: prevent NXVM's explicit TODOs from being misclassified as unowned S3 blockers.

## Justification

- Why configuration is insufficient: the boundary belongs to CPU execution and coverage governance.
- Why a pc110-js adapter or profile wrapper is insufficient: task and gate behavior is generic CPU-core work.
- Evidence supporting the change: NXVM `vcpuins.c` declares the corresponding handlers `_______todo`.
- Compatibility risk: none; supported instruction behavior is unchanged.

## Implementation Boundary

- Source and destination files: rebuilt far-control, far-return, and IDT-gate boundaries.
- Mechanical migration separated from behavior change: no PCjs source was moved.
- Generic PC/AT impact: deferred paths remain explicit rather than silently implied.
- PC110-specific impact: none.

## Verification

- Focused tests: existing protected control, IRET, RETF, and interrupt-gate tests remain green.
- Unmodified PCjs comparison: not required; this part changes no executed behavior.
- Generic PC/AT boot regression: retained by the full gate.
- PC110 regression, when established: not applicable.
- Manual browser result: not applicable.

## Future Path

- Reduction or revert strategy: replace each TODO only with separately authorized and tested CPU behavior.
- Possible upstream contribution: none.
- Deferred work: NXVM-marked task/call-gate, task-switch, and outer-RETF paths remain explicit TODO(High) boundaries.
