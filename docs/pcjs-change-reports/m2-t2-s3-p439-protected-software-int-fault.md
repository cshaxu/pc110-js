# M2 T2 S3 P439 PCjs Change Report: Protected Software-INT Fault Delivery

## Summary

- Affected PCjs-derived subsystem: rebuilt protected interrupt delivery.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: gate-DPL rejection now delivers rebuilt `#GP` instead of a host error.
- Active milestone need: preserve project-native exception behavior at the CPU boundary.

## Justification

- Why configuration is insufficient: IDT DPL admission is execution behavior.
- Why a pc110-js adapter or profile wrapper is insufficient: the executor owns fault conversion.
- Evidence supporting the change: NXVM protected interrupt logic records the matching IDT error-code convention.
- Compatibility risk: rejected software interrupts now follow the existing rebuilt fault path.

## Implementation Boundary

- Source and destination files: rebuilt executor and focused interrupt tests.
- Mechanical migration separated from behavior change: no PCjs source was moved.
- Generic PC/AT impact: protected software-INT failures become guest-visible faults.
- PC110-specific impact: none.

## Verification

- Focused tests: CPL3 software `INT` rejection, TSS stack switch, handler target, and `#GP(0x0182)` frame.
- Unmodified PCjs comparison: not required for this bounded CPU-core fault path.
- Generic PC/AT boot regression: retained by the full gate.
- PC110 regression, when established: not applicable.
- Manual browser result: not applicable.

## Future Path

- Reduction or revert strategy: retain as the common interrupt-delivery error boundary.
- Possible upstream contribution: none.
- Deferred work: remaining protection closure and later M2 T2 gates.
