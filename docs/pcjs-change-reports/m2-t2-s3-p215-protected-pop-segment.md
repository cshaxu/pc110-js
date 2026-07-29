# M2 T2 S3 P215 Protected POP Segment Report

## Summary

- Affected PCjs-derived subsystem: 80386 segment-register instruction execution.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: extends `POP ES`, `POP SS`, and `POP DS` into protected mode.
- Active milestone need: supports protected-mode stack-based segment restoration.

## Justification

- Why configuration is insufficient: segment restoration is an architectural instruction effect.
- Why a pc110-js adapter or profile wrapper is insufficient: selector validation and cache loading belong to the generic CPU.
- Evidence supporting the change: PCjs `x86ops.js` reads the selector through the old stack before applying the segment load.
- Compatibility risk: low; real-mode behavior is unchanged and protected mode reuses the existing descriptor loader.

## Implementation Boundary

- Source and destination files: PCjs `machines/pcx86/modules/v2/x86ops.js`; project `src/cpu/x86/execution.ts`.
- Mechanical migration separated from behavior change: this is a narrow project-native dispatch extension.
- Generic PC/AT impact: enables valid protected-mode data and stack segment restoration.
- PC110-specific impact: none.

## Verification

- Focused tests: protected `POP DS` reads through the old SS stack and loads the expected GDT descriptor cache.
- Unmodified PCjs comparison: old-stack ordering reviewed in source.
- Generic PC/AT boot regression: full M2 gate suite required before commit.
- PC110 regression, when established: not yet applicable.
- Manual browser result: not applicable to this CPU-unit change.

## Future Path

- Reduction or revert strategy: retain the shared loader path when 32-bit operand-size forms are added.
- Possible upstream contribution: none; PCjs already implements this behavior.
- Deferred work: 32-bit operand-size POP segment behavior and POP SS interrupt inhibition.
