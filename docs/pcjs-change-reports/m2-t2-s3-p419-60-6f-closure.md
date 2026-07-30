# M2 T2 S3 P419: 60-6F Family Closure

## Summary

- Affected PCjs-derived subsystem: none; this is rebuilt CPU family evidence.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: ARPL now delivers `#UD` in virtual-8086 mode.
- Active milestone need: close the NXVM 60-6F CPU interval.

## Justification

- The prior ARPL PE-only condition incorrectly admitted v86 execution.
- NXVM defines `_IsProtected` as PE without VM, making the correction necessary.
- Configuration or adapters cannot correct CPU mode behavior.
- Risk is bounded to the previously unsupported v86 ARPL case.

## Implementation Boundary

- Source and destination files: `instructions/arpl.ts` and focused rebuilt tests.
- No PCjs source changes or runtime imports are introduced.
- Generic PC/AT impact: corrected CPU exception behavior only.
- PC110-specific impact: none.

## Verification

- Focused tests cover all 60-6F execution categories, size prefixes, v86
  fault delivery, and string-I/O boundaries.
- The full project gate is recorded in the paired verification note.

## Future Path

- Task switching and concrete device routing remain separately ledgered.
