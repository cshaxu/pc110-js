# M2 T2 S3 P323: Rebuilt ModR/M Addressing

## Summary

- Affected PCjs-derived subsystem: generic CPU effective-address decoding.
- Source provenance record: `docs/coverage/m2-t2-nxvm-opcode-ledger.md`.
- Changed behavior: none in the active machine runtime.
- Active milestone need: support family-complete register and memory operands
  without a rebuilt runtime dependency on legacy CPU code.

## Justification

- Configuration cannot provide 80386 ModR/M or SIB decoding.
- NXVM provides the 16-bit and 32-bit addressing coverage order; Intel IA-32
  governs the operand encoding semantics; PCjs comparisons remain required for
  executable families.
- Compatibility risk: none; the module is unreferenced by the machine runtime.

## Implementation Boundary

- Source and destination files: `src/cpu/rebuilt/addressing/modrm.ts`.
- Mechanical migration separated from behavior change: no legacy source moved.
- Generic PC/AT impact: no active runtime change.
- PC110-specific impact: none.

## Verification

- Focused tests: register-direct, 16-bit direct/BP forms, 32-bit direct, SIB,
  scale, displacement, and DS/SS selection.
- Unmodified PCjs comparison: deferred until an opcode family executes.
- Generic PC/AT boot regression: retained through the legacy reference path.
- PC110 regression, when established: not applicable.
- Manual browser result: not applicable.

## Future Path

- Reduction or revert strategy: remove the unreferenced rebuilt addressing module.
- Possible upstream contribution: none.
- Deferred work: segment translation and memory operand access for the complete
  `00-3F` arithmetic family.
