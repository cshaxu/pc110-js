# M2 T2 S3 P422: 90-9F NXVM Handler Closure

## Summary

- Affected PCjs-derived subsystem: none; this is rebuilt CPU family evidence.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: verified protected conforming-code far control.
- Active milestone need: close executable NXVM 90-9F handler coverage.

## Justification

- Conforming code is a distinct descriptor privilege rule in the far-control path.
- The test exercises project-native loader behavior without a reference runtime.
- Call/task gates and cross-privilege far control remain NXVM TODO paths.

## Implementation Boundary

- Source and destination files: rebuilt far-control focused tests and records.
- No PCjs source changes or runtime imports are introduced.
- Generic PC/AT impact: CPU verification only.
- PC110-specific impact: none.

## Verification

- Focused tests cover executable 90-9F handler categories and conforming code.
- The full project gate is recorded in the paired verification note.

## Future Path

- The explicitly excluded gate and cross-ring paths require a dedicated
  project-native 80386 architecture delivery.
