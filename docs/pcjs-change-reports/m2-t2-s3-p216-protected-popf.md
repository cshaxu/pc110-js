# M2 T2 S3 P216 Protected POPF Report

## Summary

- Affected PCjs-derived subsystem: 80386 EFLAGS instruction execution.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: adds CPL-zero protected-mode `POPF` for the implemented 16-bit stack path.
- Active milestone need: restores interrupt and direction state in protected-mode control flow.

## Justification

- Why configuration is insufficient: EFLAGS restoration is an architectural instruction effect.
- Why a pc110-js adapter or profile wrapper is insufficient: EFLAGS and privilege checks belong to the generic CPU.
- Evidence supporting the change: PCjs `x86ops.js` restores the popped low word and preserves higher EFLAGS bits on 80386.
- Compatibility risk: low; real-mode POPF is unchanged and nonzero-CPL behavior remains explicit.

## Implementation Boundary

- Source and destination files: PCjs `machines/pcx86/modules/v2/x86ops.js`; project `src/cpu/x86/execution.ts`.
- Mechanical migration separated from behavior change: this is a narrow project-native dispatch extension.
- Generic PC/AT impact: enables protected-mode flags restoration through SS:SP.
- PC110-specific impact: none.

## Verification

- Focused tests: protected POPF restores a low flags word, preserves high bits, and advances the 16-bit stack.
- Unmodified PCjs comparison: low-word behavior reviewed in source.
- Generic PC/AT boot regression: full M2 gate suite required before commit.
- PC110 regression, when established: not yet applicable.
- Manual browser result: not applicable to this CPU-unit change.

## Future Path

- Reduction or revert strategy: extend the same branch once EFLAGS privilege filtering is centralized.
- Possible upstream contribution: none; PCjs already implements this behavior.
- Deferred work: nonzero-CPL filtering, virtual-8086 POPF, and 32-bit operand-size POPFD.
