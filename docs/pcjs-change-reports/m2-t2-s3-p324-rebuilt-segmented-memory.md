# M2 T2 S3 P324: Rebuilt Segmented Memory Boundary

## Summary

- Affected PCjs-derived subsystem: generic CPU segment-based operand access.
- Source provenance record: `docs/coverage/m2-t2-nxvm-opcode-ledger.md`.
- Changed behavior: none in the active machine runtime.
- Active milestone need: allow rebuilt opcode families to perform independent
  register and memory operand access.

## Justification

- Configuration cannot provide per-instruction effective-address and segment
  semantics.
- Intel IA-32 requires separate code-size, address-size, and segment-cache
  concerns. PCjs remains the compatibility reference once execution is active.
- Compatibility risk: none; the rebuilt boundary is not wired to the runtime.

## Implementation Boundary

- Source and destination files: rebuilt CPU state and `memory/segmented-memory.ts`.
- Mechanical migration separated from behavior change: no legacy source moved.
- Generic PC/AT impact: no active runtime change.
- PC110-specific impact: none.

## Verification

- Focused tests: segment base, 16-bit offset wrap, byte/word access, and CS D/B
  EIP commitment independent of memory address size.
- Unmodified PCjs comparison: deferred until a rebuilt opcode family executes.
- Generic PC/AT boot regression: retained through the legacy reference path.
- PC110 regression, when established: not applicable.
- Manual browser result: not applicable.

## Future Path

- Reduction or revert strategy: remove the unreferenced rebuilt memory module.
- Possible upstream contribution: none.
- Deferred work: paging, protection-fault delivery, and full `00-3F` execution.
