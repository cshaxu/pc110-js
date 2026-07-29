# M2 T2 S3 P232: Protected #GP Error-Code Delivery

## Summary

- Affected PCjs-derived subsystem: protected-mode fault and interrupt frames.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: ring-3 `CLI` and `STI` now deliver `#GP(0)` instead of
  raising a host unsupported-operation error.
- Active milestone need: protected-mode privilege behavior belongs to M2 S3.

## Justification

- Why configuration is insufficient: privilege checks and exception frames are CPU behavior.
- Why a pc110-js adapter or profile wrapper is insufficient: `#GP` is generic
  80386 architecture, not machine-specific policy.
- Evidence supporting the change: PCjs is the M2 behavior authority; existing
  protected interrupt tests establish the project-native gate and frame model.
- Compatibility risk: only protected-mode faults which explicitly supply an
  error code gain the extra stack word; ordinary interrupts and no-error-code
  faults retain their prior frames.

## Implementation Boundary

- Source and destination files: PCjs-derived interrupt behavior informed
  `src/cpu/x86/execution.ts` and focused tests.
- Mechanical migration separated from behavior change: no PCjs source is copied;
  the existing delivery boundary gained an optional error-code argument.
- Generic PC/AT impact: no platform device behavior changes.
- PC110-specific impact: none.

## Verification

- Focused tests: ring-3 `CLI` and `STI` both enter vector 13 with a zero error
  code and a 32-bit protected interrupt frame.
- Unmodified PCjs comparison: retained as the behavior authority; no source edit.
- Generic PC/AT boot regression: full repository gates run before commit.
- PC110 regression, when established: not applicable during generic M2 work.
- Manual browser result: not applicable to this CPU-only increment.

## Future Path

- Reduction or revert strategy: remove the optional error-code argument and
  restore the former unsupported privilege branch.
- Possible upstream contribution: none planned.
- Deferred work: additional selector, stack, and page-fault error-code sources,
  plus handler-side `IRET` conventions, remain S3 work.
