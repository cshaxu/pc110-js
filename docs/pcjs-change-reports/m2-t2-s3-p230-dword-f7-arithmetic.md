# M2 T2 S3 P230: Dword F7 Arithmetic

## Summary

- Affected PCjs-derived subsystem: 80386 Group 3 integer arithmetic execution.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: adds operand-size-overridden `F7 /2-/7` dword forms through
  the project-owned execution boundary.
- Active milestone need: M2 requires generic 80386 behavior before PC110 hardware work.

## Justification

- Why configuration is insufficient: instruction semantics are CPU behavior.
- Why a pc110-js adapter or profile wrapper is insufficient: the forms are generic
  80386 instructions, not machine-specific devices.
- Evidence supporting the change: PCjs is the M2 behavior authority; existing
  project tests establish the shared ModR/M, segment, register, and fault paths.
- Compatibility risk: arithmetic flags other than CF and OF are architecturally
  undefined after multiply and remain unmodified by this implementation.

## Implementation Boundary

- Source and destination files: PCjs x86 Group 3 behavior informed
  `src/cpu/x86/execution.ts`; `src/cpu/x86/state.ts` owns local flag updates.
- Mechanical migration separated from behavior change: no PCjs source is copied;
  the change uses project-native TypeScript boundaries and exact `BigInt` products.
- Generic PC/AT impact: adds `NOT`, `NEG`, `MUL`, `IMUL`, `DIV`, and `IDIV` for
  32-bit operands, with 16-bit and 32-bit effective addresses.
- PC110-specific impact: none.

## Verification

- Focused tests: register arithmetic, 32-bit-addressed memory divide, and
  protected-mode divide-error delivery pass in `execution.test.ts`.
- Unmodified PCjs comparison: retained as the behavior authority; no source edit.
- Generic PC/AT boot regression: full repository gates run before commit.
- PC110 regression, when established: not applicable during generic M2 work.
- Manual browser result: not applicable to this CPU-only increment.

## Future Path

- Reduction or revert strategy: remove the shared dword F7 dispatch and its flag helper.
- Possible upstream contribution: none planned.
- Deferred work: remaining instruction families, complete error-code exception
  semantics, and full machine boot checkpoints remain S3 work.
