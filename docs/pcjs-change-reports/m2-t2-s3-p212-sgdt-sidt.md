# M2 T2 S3 P212 SGDT/SIDT Behavior Report

## Summary

- Affected PCjs-derived subsystem: 80386 descriptor-table instruction execution.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: adds `SGDT` and `SIDT` memory forms with six-byte results.
- Active milestone need: supports generic protected-mode introspection and CPU detection paths.

## Justification

- Why configuration is insufficient: descriptor-table stores are architectural CPU instructions.
- Why a pc110-js adapter or profile wrapper is insufficient: the behavior belongs to the generic 80386 CPU boundary.
- Evidence supporting the change: PCjs `x86func.js` documents 80386 `SGDT/SIDT` as writing all four base bytes even in 16-bit operand-size code.
- Compatibility risk: low; only previously unsupported Group 7 memory forms gain behavior.

## Implementation Boundary

- Source and destination files: PCjs `machines/pcx86/modules/v2/x86func.js`; project `src/cpu/x86/execution.ts`.
- Mechanical migration separated from behavior change: this is a project-native TypeScript implementation of selected PCjs behavior.
- Generic PC/AT impact: enables software to inspect GDTR and IDTR accurately.
- PC110-specific impact: none.

## Verification

- Focused tests: unprefixed `SGDT` and operand-size-overridden `SIDT` store independent full-width bases.
- Unmodified PCjs comparison: source behavior and 80386 operand-size note reviewed.
- Generic PC/AT boot regression: full M2 gate suite required before commit.
- PC110 regression, when established: not yet applicable.
- Manual browser result: not applicable to this CPU-unit change.

## Future Path

- Reduction or revert strategy: retain the shared helper if Group 7 decoder unification replaces its dispatch sites.
- Possible upstream contribution: none; PCjs already implements this behavior.
- Deferred work: address-size-overridden descriptor-table operands and remaining Group 7 instructions.
