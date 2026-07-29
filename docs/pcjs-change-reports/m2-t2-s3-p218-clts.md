# M2 T2 S3 P218 CLTS Report

## Summary

- Affected PCjs-derived subsystem: 80386 control-state instruction execution.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: adds CPL-zero `CLTS`.
- Active milestone need: supports generic task-switched state clearing.

## Justification

- Why configuration is insufficient: CR0.TS is CPU architectural state.
- Why a pc110-js adapter or profile wrapper is insufficient: CLTS belongs to the generic 80386 CPU.
- Evidence supporting the change: PCjs `x86op0f.js` checks CPL and clears only CR0.TS.
- Compatibility risk: low; the instruction only gains its selected 80386 state transition.

## Implementation Boundary

- Source and destination files: PCjs `machines/pcx86/modules/v2/x86op0f.js`; project `src/cpu/x86/state.ts` and `src/cpu/x86/execution.ts`.
- Mechanical migration separated from behavior change: narrow project-native instruction dispatch and state transition.
- Generic PC/AT impact: permits privileged code to clear task-switched state.
- PC110-specific impact: none.

## Verification

- Focused tests: CLTS clears CR0.TS while preserving the remaining CR0 bits.
- Unmodified PCjs comparison: source behavior reviewed.
- Generic PC/AT boot regression: full M2 gate suite required before commit.
- PC110 regression, when established: not yet applicable.
- Manual browser result: not applicable to this CPU-unit change.

## Future Path

- Reduction or revert strategy: retain the state method until a typed CR0 model supersedes it.
- Possible upstream contribution: none; PCjs already implements this behavior.
- Deferred work: nonzero-CPL #GP(0) delivery and FPU execution.
