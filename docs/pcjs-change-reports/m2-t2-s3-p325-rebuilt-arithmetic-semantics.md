# M2 T2 S3 P325: Rebuilt Arithmetic Semantics

## Summary

- Affected PCjs-derived subsystem: generic 80386 arithmetic and EFLAGS behavior.
- Source provenance record: `docs/coverage/m2-t2-nxvm-opcode-ledger.md`.
- Changed behavior: none in the active machine runtime.
- Active milestone need: implement one reusable semantic source for the full
  `00-3F` arithmetic interval.

## Justification

- Configuration and profile adapters cannot define arithmetic flags.
- NXVM covers the arithmetic handler families; Intel IA-32 resolves flag
  semantics; PCjs remains required for execution-family comparison.
- Compatibility risk: none; this module is not yet dispatched at runtime.

## Implementation Boundary

- Source and destination files: `src/cpu/rebuilt/instructions/arithmetic.ts`.
- Mechanical migration separated from behavior change: no legacy source moved.
- Generic PC/AT impact: no active runtime change.
- PC110-specific impact: none.

## Verification

- Focused tests: signed overflow, carry, auxiliary carry, parity, sign, zero,
  ADC/SBB carry input, dword unsigned normalization, and logical undefined AF.
- Unmodified PCjs comparison: deferred until the completed `00-3F` execution
  family is dispatched.
- Generic PC/AT boot regression: retained through the legacy reference path.
- PC110 regression, when established: not applicable.
- Manual browser result: not applicable.

## Future Path

- Reduction or revert strategy: remove the unreferenced rebuilt semantics module.
- Possible upstream contribution: none.
- Deferred work: dispatch every `00-3F` opcode form, operand access, and adjust
  instruction before claiming family completion.
