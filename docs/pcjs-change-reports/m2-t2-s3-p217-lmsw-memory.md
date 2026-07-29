# M2 T2 S3 P217 LMSW Memory Form Report

## Summary

- Affected PCjs-derived subsystem: 80386 machine-status instruction execution.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: extends `LMSW r/m16` from a register-only path to a ModR/M memory source.
- Active milestone need: supports firmware machine-status loading through generic CPU addressing.

## Justification

- Why configuration is insufficient: LMSW is an architectural CPU instruction.
- Why a pc110-js adapter or profile wrapper is insufficient: CR0 machine-status behavior belongs to the generic 80386 CPU.
- Evidence supporting the change: PCjs `x86func.js` accepts the decoded `r/m16` source and applies its machine-status update without a register-only restriction.
- Compatibility risk: low; the existing register form retains its behavior and memory sources use the established 16-bit ModR/M path.

## Implementation Boundary

- Source and destination files: PCjs `machines/pcx86/modules/v2/x86func.js`; project `src/cpu/x86/execution.ts`.
- Mechanical migration separated from behavior change: this is a narrow project-native dispatch extension.
- Generic PC/AT impact: supports firmware use of a memory-resident machine-status word.
- PC110-specific impact: none.

## Verification

- Focused tests: a direct memory operand loads CR0 through the existing machine-status normalization boundary.
- Unmodified PCjs comparison: `fnLMSW` source behavior reviewed.
- Generic PC/AT boot regression: full M2 gate suite required before commit.
- PC110 regression, when established: not yet applicable.
- Manual browser result: not applicable to this CPU-unit change.

## Future Path

- Reduction or revert strategy: retain the shared ModR/M source path if Group 7 dispatch is later unified.
- Possible upstream contribution: none; PCjs already implements this behavior.
- Deferred work: virtual-8086 privilege behavior and complete protected-mode fault delivery.
