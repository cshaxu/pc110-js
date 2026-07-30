# M2 T2 S3 P425: C0-CF NXVM Handler Closure

## Summary

- Affected PCjs-derived subsystem: none; this is rebuilt CPU family evidence.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: none; expanded default-32 C0-CF verification.
- Active milestone need: close executable NXVM C0-CF handler coverage.

## Justification

- Prior C0-CF evidence established forms and protection paths but lacked direct default-32 regressions across several handler classes.
- The focused tests exercise only project-native decode, memory, stack, and segment state.

## Implementation Boundary

- Source and destination files: rebuilt C0-CF focused tests and records.
- No PCjs source changes or runtime imports are introduced.
- Generic PC/AT impact: CPU verification only.
- PC110-specific impact: none.

## Verification

- Focused tests cover default-32 shift, immediate MOV, far pointer, and return cleanup behavior.
- Existing tests retain interrupts, privilege transitions, and access-fault coverage.
- The full project gate is recorded in the paired verification note.

## Future Path

- Task and gate paths beyond executable NXVM handler coverage remain separately ledgered architecture work.
