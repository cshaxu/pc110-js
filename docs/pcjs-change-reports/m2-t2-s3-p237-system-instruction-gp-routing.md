# M2 T2 S3 P237: System Instruction #GP Routing

## Summary

- Affected PCjs-derived subsystem: protected 0F 01 system-instruction dispatch.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: ring-3 LGDT, LIDT, and LMSW forms deliver `#GP(0)` first.
- Active milestone need: protected privilege behavior belongs to M2 S3.

## Justification

- Why configuration is insufficient: descriptor-table and machine-status writes
  are CPU privilege behavior.
- Why a pc110-js adapter or profile wrapper is insufficient: these instructions
  are generic 80386 architecture.
- Evidence supporting the change: P232 supplies the verified error-code frame;
  existing 0F 01 tests establish the state and operand paths.
- Compatibility risk: SGDT, SIDT, SMSW, and successful CPL-zero forms are unchanged.

## Implementation Boundary

- Source and destination files: PCjs-derived system-instruction behavior informed
  `src/cpu/x86/execution.ts` and focused tests.
- Mechanical migration separated from behavior change: no PCjs source is copied.
- Generic PC/AT impact: invalid ring-3 attempts cannot read operands or mutate
  GDTR, IDTR, or CR0.
- PC110-specific impact: none.

## Verification

- Focused tests: 16-bit LGDT, LIDT, LMSW, and operand-size-overridden LGDT all
  enter vector 13 with a zero error code and preserve architectural state.
- Unmodified PCjs comparison: retained as the behavior authority; no source edit.
- Generic PC/AT boot regression: full repository gates run before commit.
- PC110 regression, when established: not applicable during generic M2 work.
- Manual browser result: not applicable to this CPU-only increment.

## Future Path

- Reduction or revert strategy: restore the 0F 01 paths without the prechecks.
- Possible upstream contribution: none planned.
- Deferred work: selector-derived error codes and unimplemented system behavior
  remain separate S3 work.
