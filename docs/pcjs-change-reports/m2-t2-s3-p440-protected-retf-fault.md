# M2 T2 S3 P440 PCjs Change Report: Protected RETF Fault Delivery

## Summary

- Affected PCjs-derived subsystem: rebuilt far-return fault boundary.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: invalid protected RETF restores its return frame before rebuilt fault delivery.
- Active milestone need: prevent partial stack mutation before a guest-visible selector fault.

## Justification

- Why configuration is insufficient: RETF stack and selector behavior is CPU execution.
- Why a pc110-js adapter or profile wrapper is insufficient: fault recovery belongs in the CPU core.
- Evidence supporting the change: NXVM far-return flow validates a new code segment before committing state.
- Compatibility risk: invalid RETF now presents an intact return stack to the fault handler.

## Implementation Boundary

- Source and destination files: rebuilt stack-frame control and focused tests.
- Mechanical migration separated from behavior change: no PCjs source was moved.
- Generic PC/AT impact: protected RETF faults retain the original frame.
- PC110-specific impact: none.

## Verification

- Focused tests: CPL3 RETF through a null selector reaches ring-zero `#GP(0)` via a 32-bit TSS stack.
- Unmodified PCjs comparison: not required for this bounded CPU-core fault path.
- Generic PC/AT boot regression: retained by the full gate.
- PC110 regression, when established: not applicable.
- Manual browser result: not applicable.

## Future Path

- Reduction or revert strategy: retain this common far-return fault boundary.
- Possible upstream contribution: none.
- Deferred work: remaining protection closure and later M2 T2 gates.
