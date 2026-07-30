# M2 T2 S3 P431: NXVM Prefix And Decode-Length Closure

## Summary

- Affected PCjs-derived subsystem: none; this is project-native decoder work.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: overlong instruction reads now deliver rebuilt `#GP(0)`.
- Active milestone need: close the NXVM prefix/decode boundary.

## Justification

- The decoder rejected fifteen prefixes but the executor could still read a
  secondary opcode, ModR/M byte, or immediate past the 15-byte instruction limit.
- The bounded reader makes the same length rule apply to all rebuilt handlers.

## Implementation Boundary

- Source and destination files: rebuilt executor, prefix/decode tests, and records.
- No PCjs source changes or runtime imports are introduced.
- Generic PC/AT impact: CPU fault delivery only.
- PC110-specific impact: none.

## Verification

- Focused tests retain repeated-prefix, default-size, override, and decode-limit
  coverage and execute an overlong escaped opcode through the real-mode `#GP` path.
- The full project gate is recorded in the paired verification note.

## Future Path

- Shared paging, segmentation, privilege, and event-completion work remains
  separately ledgered.
