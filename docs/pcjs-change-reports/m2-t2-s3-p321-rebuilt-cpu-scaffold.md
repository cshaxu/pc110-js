# M2 T2 S3 P321: Rebuilt CPU Scaffold

## Summary

- Affected PCjs-derived subsystem: generic M2 CPU structure.
- Source provenance record: `docs/coverage/m2-t2-nxvm-opcode-ledger.md`.
- Changed behavior: none in the active machine runtime.
- Active milestone need: establish an independent TypeScript CPU boundary before
  opcode-family reconstruction begins.

## Justification

- Configuration cannot provide a separate CPU implementation boundary.
- A profile adapter cannot prevent a new CPU from importing the frozen legacy
  implementation at runtime.
- The structure follows the owner-authorized NXVM-inspired layering while
  retaining project-native TypeScript code and PCjs comparison requirements.
- Compatibility risk: the existing `CpuStepper` and PC/AT core remain wired to
  the frozen legacy CPU.

## Implementation Boundary

- Source and destination files: new `src/cpu/rebuilt/` state, decode, event,
  and debug contracts only.
- Mechanical migration separated from behavior change: no legacy source moved.
- Generic PC/AT impact: none until a verified rebuilt execution path exists.
- PC110-specific impact: none.

## Verification

- Focused tests: reset state, register aliases, and prefix defaults/repetition.
- Unmodified PCjs comparison: retained for completed opcode families.
- Generic PC/AT boot regression: retained through the legacy reference path.
- PC110 regression, when established: not applicable.
- Manual browser result: not applicable; no UI or runtime path changed.

## Future Path

- Reduction or revert strategy: remove the unreferenced scaffold or select the
  frozen reference branch.
- Possible upstream contribution: none.
- Deferred work: complete the prefix family, then implement opcode family
  `00-3F` in ledger order.
