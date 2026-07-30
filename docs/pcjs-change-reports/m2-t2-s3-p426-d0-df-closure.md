# M2 T2 S3 P426: D0-DF NXVM Handler Closure

## Summary

- Affected PCjs-derived subsystem: none; this is rebuilt CPU family evidence.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: none; expanded default-32 XLAT verification.
- Active milestone need: close executable NXVM D0-DF handler coverage.

## Justification

- Existing XLAT evidence required a direct default-32 address-size regression.
- The family audit also records explicit rebuilt handling for D8-DF.

## Implementation Boundary

- Source and destination files: rebuilt D0-DF focused tests and records.
- No PCjs source changes or runtime imports are introduced.
- Generic PC/AT impact: CPU verification only.
- PC110-specific impact: none.

## Verification

- Focused tests cover Group Two, AAM/AAD, XLAT, and D8-DF faulting frames.
- The full project gate is recorded in the paired verification note.

## Future Path

- No FPU behavior is claimed; NXVM's unsupported x87 primary-opcode path remains rebuilt `#UD`.
