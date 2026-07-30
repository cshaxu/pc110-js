# M2 T2 S3 P320: NXVM-Ordered CPU Reconstruction Method

## Summary

- Affected PCjs-derived subsystem: generic M2 CPU implementation method.
- Source provenance record: `docs/decisions/m2-t2-nxvm-cpu-authority.md`.
- Changed behavior: none; this part freezes the verified legacy CPU reference
  and records the rebuilt CPU method.
- Active milestone need: prevent incomplete execution-context patching from
  becoming the primary path to full 80386 coverage.

## Justification

- Configuration cannot supply a complete, independently structured CPU core.
- An adapter cannot turn incremental legacy execution patches into a
  family-complete CPU implementation.
- NXVM supplies ordered CPU coverage and behavior evidence; Intel resolves
  semantics; PCjs remains the PC/AT comparison authority.
- Compatibility risk: no runtime behavior changes in this part. The frozen
  branch preserves the current verified reference for regression comparison.

## Implementation Boundary

- Source and destination files: current `src/cpu/x86/` remains legacy/reference;
  future project-native modules reside under `src/cpu/rebuilt/`.
- Mechanical migration separated from behavior change: no source files moved.
- Generic PC/AT impact: future rebuilt CPU preserves existing machine and
  device interfaces.
- PC110-specific impact: none.

## Verification

- Focused tests: existing legacy/reference test suite remains required.
- Unmodified PCjs comparison: retained as an M2 completion gate.
- Generic PC/AT boot regression: retained through the selected ROM trace.
- PC110 regression, when established: not applicable.
- Manual browser result: not applicable; this part changes no UI or runtime.

## Future Path

- Reduction or revert strategy: select `cpu-legacy-reference` at `26bd074`.
- Possible upstream contribution: none.
- Deferred work: rebuilt opcode families only, in ledger order and verified
  family-sized parts.
