# M2 T2 S3 P421: POPF Hidden-CPL Privilege

## Summary

- Affected PCjs-derived subsystem: none; this is rebuilt CPU privilege behavior.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: POPF derives CPL from the CS hidden cache rather than selector RPL.
- Active milestone need: preserve the NXVM CPU mode model during 90-9F work.

## Justification

- P388 established hidden-cache DPL as the project-native CPL source.
- Selector RPL can differ from cached DPL after architected segment transitions.
- Configuration and adapters cannot correct CPU privilege behavior.
- Risk is limited to POPF under deliberately divergent CS cache state.

## Implementation Boundary

- Source and destination files: rebuilt flag-stack module and focused tests.
- No PCjs source changes or runtime imports are introduced.
- Generic PC/AT impact: corrected POPF IOPL preservation.
- PC110-specific impact: none.

## Verification

- A focused regression distinguishes cached DPL three from selector RPL zero.
- The full project gate is recorded in the paired verification note.

## Future Path

- Cross-privilege far control remains a separate incomplete architecture path.
