# M2 T2 S3 P211 LGDT/LIDT Operand-Size Report

## Summary

- Affected PCjs-derived subsystem: 80386 descriptor-table instruction execution.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: adds `66 0F 01 /2` and `/3` to load a full 32-bit table base.
- Active milestone need: supports generic 80386 protected-mode table placement.

## Justification

- Why configuration is insufficient: operand-size is architectural instruction state.
- Why a pc110-js adapter or profile wrapper is insufficient: GDT and IDT loading belongs to the generic CPU boundary.
- Evidence supporting the change: PCjs `x86func.js` documents the 80386 48-bit pseudo-descriptor and loads a 32-bit base when the operand size is 32 bits.
- Compatibility risk: low; unprefixed 16-bit forms continue to zero-extend their 24-bit base.

## Implementation Boundary

- Source and destination files: PCjs `machines/pcx86/modules/v2/x86func.js`; project `src/cpu/x86/execution.ts`.
- Mechanical migration separated from behavior change: this is a project-native TypeScript implementation of the selected architectural behavior.
- Generic PC/AT impact: enables descriptor tables above 16 MiB for 32-bit operand-size code.
- PC110-specific impact: none.

## Verification

- Focused tests: paired real-mode `66 LGDT` and `66 LIDT` execution validates distinct high-byte bases.
- Unmodified PCjs comparison: source behavior and operand-size distinction reviewed.
- Generic PC/AT boot regression: full M2 gate suite required before commit.
- PC110 regression, when established: not yet applicable.
- Manual browser result: not applicable to this CPU-unit change.

## Future Path

- Reduction or revert strategy: remove only the prefixed dispatch branch if later decoder unification supersedes it.
- Possible upstream contribution: none; PCjs already implements this behavior.
- Deferred work: address-size-overridden descriptor-table memory operands and remaining Group 7 forms.
