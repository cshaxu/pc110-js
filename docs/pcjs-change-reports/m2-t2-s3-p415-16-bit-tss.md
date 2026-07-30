# M2 T2 S3 P415: 16-bit TSS Privilege Stack

## Summary

- Affected PCjs-derived subsystem: rebuilt CPU interrupt delivery only.
- Source provenance record: NXVM `vcpuins.c` virtual-8086 TSS layout selection.
- Changed behavior: rebuilt delivery now accepts valid 16-bit TSS layouts.
- Active milestone need: close the recorded TSS architectural dependency.

## Justification

- Configuration and adapters cannot select CPU architectural TSS layouts.
- The change is project-native and does not alter PCjs source or runtime.
- NXVM reads 16-bit SP0/SS0 at offsets 2/4 and 32-bit ESP0/SS0 at 4/8.
- Compatibility risk is bounded by explicit type and TSS-limit checks.

## Implementation Boundary

- Source and destination files: rebuilt interrupt delivery and focused CPU tests.
- Mechanical migration separated from behavior change: no source was copied.
- Generic PC/AT impact: protected interrupt stack selection only.
- PC110-specific impact: none.

## Verification

- Focused tests: 16-bit LTR, outer-privilege IRET, and v86 IRET round trips.
- Unmodified PCjs comparison: not applicable; PCjs is not altered.
- Generic PC/AT boot regression: covered by the full project gate.
- PC110 regression: not established in M2.
- Manual browser result: not required for this CPU-only part.

## Future Path

- Reduction or revert strategy: retain the existing 32-bit path independently.
- Possible upstream contribution: none.
- Deferred work: task switching and non-ring-zero privilege stacks.
