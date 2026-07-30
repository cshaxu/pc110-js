# M2 T2 S3 P442 PCjs Change Report: Complete NXVM TODO Boundaries

## Summary

- Affected PCjs-derived subsystem: rebuilt I/O, interrupt, WAIT, and undefined-opcode boundaries.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: none; source comments now identify every remaining NXVM TODO counterpart.
- Active milestone need: preserve explicit authority boundaries without downgrading tested project-native behavior.

## Justification

- Why configuration is insufficient: these are CPU-core coverage boundaries.
- Why a pc110-js adapter or profile wrapper is insufficient: I/O admission, exceptions, and undefined instructions execute in the CPU core.
- Evidence supporting the change: NXVM `vcpuins.c` declares the corresponding handlers `_______todo`.
- Compatibility risk: none; behavior and tests are unchanged.

## Implementation Boundary

- Source and destination files: rebuilt I/O permission, interrupt, event, WAIT, and undefined-opcode modules.
- Mechanical migration separated from behavior change: no PCjs source was moved.
- Generic PC/AT impact: NXVM TODO counterparts are visible in the owned implementation.
- PC110-specific impact: none.

## Verification

- Focused tests: existing I/O permission, interrupt, WAIT, and undefined-opcode suites remain green.
- Unmodified PCjs comparison: not required; this part changes no execution behavior.
- Generic PC/AT boot regression: retained by the full gate.
- PC110 regression, when established: not applicable.
- Manual browser result: not applicable.

## Future Path

- Reduction or revert strategy: remove a marker only when a replacement authority and focused proof are recorded.
- Possible upstream contribution: none.
- Deferred work: NXVM's TODO declaration remains visible even where pc110-js provides independently tested behavior.
