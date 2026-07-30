# M2 T2 S3 P429: 0F 80-9F NXVM Conditional Handler Closure

## Summary

- Affected PCjs-derived subsystem: none; this is rebuilt CPU family evidence.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: none; expanded default-32 conditional-handler verification.
- Active milestone need: close executable NXVM 0F 80-9F handler coverage.

## Justification

- Existing conditional tests lacked unprefixed default-32 SETcc memory and
  default-32 `66` near-Jcc displacement evidence.
- The focused tests exercise only project-native rebuilt CPU modules.

## Implementation Boundary

- Source and destination files: rebuilt 0F conditional focused tests and records.
- No PCjs source changes or runtime imports are introduced.
- Generic PC/AT impact: CPU verification only.
- PC110-specific impact: none.

## Verification

- Focused tests cover all condition selectors, EFLAGS preservation, ModR/M,
  default-32 memory addressing, and operand-size-reversed branch length.
- The full project gate is recorded in the paired verification note.

## Future Path

- The A0-BF extended intervals and outstanding architecture dependencies stay
  separately ledgered.
