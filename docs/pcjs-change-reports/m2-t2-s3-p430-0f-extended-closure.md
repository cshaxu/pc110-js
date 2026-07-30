# M2 T2 S3 P430: 0F A0-BF NXVM Extended Handler Closure

## Summary

- Affected PCjs-derived subsystem: none; this is rebuilt CPU family evidence.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: none; expanded default-32 extended-handler verification.
- Active milestone need: close executable NXVM 0F A0-BF handler coverage.

## Justification

- Existing extended tests did not demonstrate unprefixed default-32 execution
  across its arithmetic, bit, scan, extension, and memory-addressing forms.
- NXVM deliberately fixes the r/m16 MOVZX/MOVSX destination to r32; the
  project-native implementation retains that documented handler behavior.

## Implementation Boundary

- Source and destination files: rebuilt 0F extended focused tests and records.
- No PCjs source changes or runtime imports are introduced.
- Generic PC/AT impact: CPU verification only.
- PC110-specific impact: none.

## Verification

- Focused tests retain family and fault coverage while adding default-32
  operands, ModR/M memory addressing, and fixed-r32 extension evidence.
- The full project gate is recorded in the paired verification note.

## Future Path

- Shared segment/page delivery and task/gate architecture dependencies remain
  governed by their separate ledger entries.
