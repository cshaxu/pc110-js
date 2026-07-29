# M2 T2 S3 P219 32-Bit Far Jump Report

## Summary

- Affected PCjs-derived subsystem: 80386 far control-transfer execution.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: adds protected-mode `66 EA ptr16:32`.
- Active milestone need: enables validated transitions into 32-bit code segments.

## Justification

- Why configuration is insufficient: far-jump operand size is architectural instruction state.
- Why a pc110-js adapter or profile wrapper is insufficient: code-segment loading belongs to the generic CPU.
- Evidence supporting the change: PCjs `x86ops.js` uses operand-width-specific offset fetches before its code-segment loader.
- Compatibility risk: low; existing 16-bit far-jump behavior is unchanged.

## Implementation Boundary

- Source and destination files: PCjs `machines/pcx86/modules/v2/x86ops.js`; project `src/cpu/x86/execution.ts`.
- Mechanical migration separated from behavior change: narrow project-native prefix dispatch using the established protected loader.
- Generic PC/AT impact: permits 32-bit protected-mode code entry.
- PC110-specific impact: none.

## Verification

- Focused tests: a `66 EA` instruction loads a validated GDT code descriptor and full 32-bit EIP.
- Unmodified PCjs comparison: far-jump source behavior reviewed.
- Generic PC/AT boot regression: full M2 gate suite required before commit.
- PC110 regression, when established: not yet applicable.
- Manual browser result: not applicable to this CPU-unit change.

## Future Path

- Reduction or revert strategy: retain the shared code-loader call until far-transfer decoder unification.
- Possible upstream contribution: none; PCjs already implements the behavior.
- Deferred work: real-mode 32-bit pointer semantics and memory far-jump operand-size variants.
