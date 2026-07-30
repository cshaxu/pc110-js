# M2 T2 S3 P322: Rebuilt Instruction Decode Boundary

## Summary

- Affected PCjs-derived subsystem: generic CPU instruction decode.
- Source provenance record: `docs/coverage/m2-t2-nxvm-opcode-ledger.md`.
- Changed behavior: none in the active machine runtime.
- Active milestone need: preserve a single instruction-start and size-selection
  boundary before opcode-family execution begins.

## Justification

- Configuration and adapters cannot supply a project-native decoded-instruction
  contract.
- NXVM `ExecInit` and `ExecIns` establish the reference requirement to retain
  the instruction start across prefix decoding; Intel defines the 15-byte
  architectural instruction limit.
- PCjs remains required for completed-family compatibility comparisons.
- Compatibility risk: none; the rebuilt decoder is not wired to the runtime.

## Implementation Boundary

- Source and destination files: `src/cpu/rebuilt/decode/decoder.ts`.
- Mechanical migration separated from behavior change: no legacy files moved.
- Generic PC/AT impact: none until a verified rebuilt execution core exists.
- PC110-specific impact: none.

## Verification

- Focused tests: CS D/B defaults, 66/67, last segment/repeat prefixes, length,
  and start-EIP error data.
- Unmodified PCjs comparison: deferred until an opcode family executes.
- Generic PC/AT boot regression: retained through the legacy reference path.
- PC110 regression, when established: not applicable.
- Manual browser result: not applicable.

## Future Path

- Reduction or revert strategy: remove the unreferenced rebuilt decode module.
- Possible upstream contribution: none.
- Deferred work: complete prefix fault delivery with the event subsystem and
  begin the `00-3F` arithmetic family after ModR/M and memory boundaries exist.
