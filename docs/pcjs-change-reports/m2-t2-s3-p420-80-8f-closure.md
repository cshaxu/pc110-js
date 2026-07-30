# M2 T2 S3 P420: 80-8F Family Closure

## Summary

- Affected PCjs-derived subsystem: none; this is rebuilt CPU family evidence.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: complete legal `8C/8E` segment-register encoding coverage.
- Active milestone need: close the NXVM 80-8F CPU interval.

## Justification

- Individual opcode slices already existed but the legal segment encoding matrix
  was not directly evidenced as one family.
- Configuration and adapters cannot provide CPU instruction coverage.
- The new tests verify project-native execution without altering PCjs.
- Risk is limited to previously untested segment-register encodings.

## Implementation Boundary

- Source and destination files: rebuilt segment-MOV focused tests and records.
- No PCjs source changes or runtime imports are introduced.
- Generic PC/AT impact: CPU verification only.
- PC110-specific impact: none.

## Verification

- Focused tests cover every 80-8F execution category, legal segment selector,
  required prefixes, and invalid `#UD` paths.
- The full project gate is recorded in the paired verification note.

## Future Path

- Whole-machine differential evidence remains part of the final S3/S6 gates.
