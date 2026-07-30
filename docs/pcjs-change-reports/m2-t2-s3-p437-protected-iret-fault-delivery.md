# M2 T2 S3 P437 PCjs Change Report: Protected IRET Fault Delivery

## Summary

- Affected PCjs-derived subsystem: rebuilt protected interrupt and return path.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: invalid protected IRET to a more-privileged target no
  longer leaks a host error; it delivers rebuilt `#GP` with the selector error
  code.
- Active milestone need: preserve CPU fault and restart behavior at the
  project-native execution boundary.

## Justification

- Why configuration is insufficient: this is instruction execution behavior.
- Why a pc110-js adapter or profile wrapper is insufficient: fault delivery is
  CPU-core behavior.
- Evidence supporting the change: NXVM protected IRET is an explicit TODO, but
  its exception model and selector fault conventions guide the project-native
  completion; focused rebuilt TSS-frame evidence verifies the result.
- Compatibility risk: invalid protected IRET now follows the established rebuilt
  fault path instead of throwing a host-language error.

## Implementation Boundary

- Source and destination files: rebuilt IRET execution and focused tests.
- Mechanical migration separated from behavior change: no PCjs code was moved.
- Generic PC/AT impact: invalid protected IRET becomes architecturally visible.
- PC110-specific impact: none.

## Verification

- Focused tests: protected CPL3-to-ring0 invalid IRET through a 32-bit TSS
  stack, including fault EIP, `#GP(0x0008)`, and frame state.
- Unmodified PCjs comparison: not required for this bounded CPU-core fault path.
- Generic PC/AT boot regression: retained by the full gate.
- PC110 regression, when established: not applicable.
- Manual browser result: not applicable.

## Future Path

- Reduction or revert strategy: retain this path as the common IRET fault boundary.
- Possible upstream contribution: none.
- Deferred work: remaining full privilege, task, and call-gate architecture paths.
