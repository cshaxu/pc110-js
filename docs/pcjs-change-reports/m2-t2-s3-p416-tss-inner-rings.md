# M2 T2 S3 P416: TSS Inner Privilege Stacks

## Summary

- Affected PCjs-derived subsystem: rebuilt CPU interrupt delivery only.
- Source provenance record: project 80386 TSS coverage ledger.
- Changed behavior: rebuilt delivery selects TSS stacks for target rings one and two.
- Active milestone need: close an explicit protected interrupt dependency.

## Justification

- Configuration and adapters cannot supply CPU privilege-stack semantics.
- The implementation remains project-native and does not alter PCjs source.
- 80386 TSS layouts define distinct SP/ESP and SS slots for rings zero through two.
- Compatibility risk is bounded by the existing TR type, limit, and segment checks.

## Implementation Boundary

- Source and destination files: rebuilt interrupt delivery and focused CPU tests.
- Mechanical migration separated from behavior change: no source was copied.
- Generic PC/AT impact: protected interrupt stack selection only.
- PC110-specific impact: none.

## Verification

- Focused tests: CPL3-to-CPL1 32-bit TSS and CPL3-to-CPL2 16-bit TSS round trips.
- Unmodified PCjs comparison: not applicable; PCjs is not altered.
- Generic PC/AT boot regression: covered by the full project gate.
- PC110 regression: not established in M2.
- Manual browser result: not required for this CPU-only part.

## Future Path

- Reduction or revert strategy: each TSS stack slot remains independently decoded.
- Possible upstream contribution: none.
- Deferred work: hardware task switching.
