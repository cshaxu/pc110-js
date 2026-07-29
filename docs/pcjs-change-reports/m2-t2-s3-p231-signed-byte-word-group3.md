# M2 T2 S3 P231: Signed Byte And Word Group 3

## Summary

- Affected PCjs-derived subsystem: 80386 Group 3 integer arithmetic execution.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: adds signed byte and word `IMUL` and `IDIV` to existing
  `F6` and `F7` dispatch.
- Active milestone need: generic 80386 instruction completeness remains M2 work.

## Justification

- Why configuration is insufficient: operand-width arithmetic is CPU behavior.
- Why a pc110-js adapter or profile wrapper is insufficient: these instructions
  are generic x86 semantics, not PC110-specific behavior.
- Evidence supporting the change: PCjs remains the M2 behavior authority; P230
  already establishes the project-native dword signed arithmetic model.
- Compatibility risk: only defined CF and OF multiply outcomes are changed;
  quotient range failures use the existing divide-error boundary.

## Implementation Boundary

- Source and destination files: PCjs Group 3 behavior informed
  `src/cpu/x86/execution.ts` and its focused tests.
- Mechanical migration separated from behavior change: no PCjs source is copied;
  exact `BigInt` arithmetic prevents host-number width loss.
- Generic PC/AT impact: `F6 /5,/7` uses AX and `F7 /5,/7` uses DX:AX.
- PC110-specific impact: none.

## Verification

- Focused tests: signed byte and word products, quotient values, and signed
  remainders pass in `execution.test.ts`.
- Unmodified PCjs comparison: retained as the behavior authority; no source edit.
- Generic PC/AT boot regression: full repository gates run before commit.
- PC110 regression, when established: not applicable during generic M2 work.
- Manual browser result: not applicable to this CPU-only increment.

## Future Path

- Reduction or revert strategy: remove only the `/5` and `/7` branches.
- Possible upstream contribution: none planned.
- Deferred work: remaining CPU execution and exception behavior stays within S3.
