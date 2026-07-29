# M2 T2 S3 P213 Control-Register Transfer Report

## Summary

- Affected PCjs-derived subsystem: 80386 control-register instruction execution.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: extends `0F 20/22` from CR0-only support to CR0, CR2, and CR3.
- Active milestone need: allows generic 80386 software to establish and inspect paging control state.

## Justification

- Why configuration is insufficient: control-register transfers are privileged architectural instructions.
- Why a pc110-js adapter or profile wrapper is insufficient: CR state is owned by the generic CPU model.
- Evidence supporting the change: PCjs `x86op0f.js` implements CR0, CR2, and CR3 and preserves the early-80386 behavior that ignores non-register `MOD` bits.
- Compatibility risk: low; unsupported forms gain selected 80386 behavior while unsupported CR indices remain explicit failures.

## Implementation Boundary

- Source and destination files: PCjs `machines/pcx86/modules/v2/x86op0f.js`; project `src/cpu/x86/state.ts` and `src/cpu/x86/execution.ts`.
- Mechanical migration separated from behavior change: this is a project-native TypeScript implementation of selected PCjs behavior.
- Generic PC/AT impact: enables CR2 fault-address observation and aligned CR3 page-directory state.
- PC110-specific impact: none.

## Verification

- Focused tests: read CR2, read CR3 through a noncanonical `MOD`, write aligned CR3, and write CR0.
- Unmodified PCjs comparison: source control-register switch and 80386 `MOD` note reviewed.
- Generic PC/AT boot regression: full M2 gate suite required before commit.
- PC110 regression, when established: not yet applicable.
- Manual browser result: not applicable to this CPU-unit change.

## Future Path

- Reduction or revert strategy: retain the local control-register switch until a typed register-bank abstraction replaces it.
- Possible upstream contribution: none; PCjs already implements this behavior.
- Deferred work: debug registers, paging-memory integration, and nonzero-CPL `#GP(0)` delivery.
