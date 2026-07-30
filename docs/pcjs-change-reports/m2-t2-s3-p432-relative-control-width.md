# M2 T2 S3 P432: Relative-Control Operand-Size Correction

## Summary

- Affected PCjs-derived subsystem: none; this corrects project-native CPU control flow.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: taken relative targets now follow instruction operand size.
- Active milestone need: retain NXVM-compatible 80386 control-transfer semantics.

## Justification

- NXVM `_e_jcc` delegates taken near-target width to `_GetOperandSize`.
- The rebuilt handlers incorrectly used the CS default width, which differs for
  default-32 code carrying a `66` prefix.

## Implementation Boundary

- Source and destination files: rebuilt relative-control handlers, tests, and records.
- No PCjs source changes or runtime imports are introduced.
- Generic PC/AT impact: CPU control-flow correctness only.
- PC110-specific impact: none.

## Verification

- Focused tests cover default-32 high-EIP `66` Jcc and JMP targets, plus the
  existing short-Jump, LOOP, far-control, and prefix coverage.
- The full project gate is recorded in the paired verification note.

## Future Path

- Far call/jump gates and privilege-transfer behavior remain separate architecture work.
