# M2 T2 S3 P444 PCjs Change Report: Control-Transfer Target Validation

## Summary

- Affected PCjs-derived subsystem: rebuilt near and far control transfer.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: invalid target code offsets fault before committing the transfer.
- Active milestone need: preserve source-EIP fault delivery and transactional control state.

## Justification

- Why configuration is insufficient: target validation belongs to CPU instruction execution.
- Why a pc110-js adapter or profile wrapper is insufficient: all generic control-transfer families share the boundary.
- Evidence supporting the change: NXVM `_kec_*` control helpers validate target code offsets before commit.
- Compatibility risk: invalid transfers no longer leave target control state visible before fault delivery.

## Implementation Boundary

- Source and destination files: rebuilt segmented memory, segment loading, and control instruction families.
- Mechanical migration separated from behavior change: no PCjs source was moved.
- Generic PC/AT impact: target-code limits and page translation are checked at transfer time.
- PC110-specific impact: none.

## Verification

- Focused tests: an invalid protected FAR JMP reaches `#GP` with the source EIP and original CS.
- Unmodified PCjs comparison: not required for this bounded CPU-core fault path.
- Generic PC/AT boot regression: retained by the full gate.
- PC110 regression, when established: not applicable.
- Manual browser result: not applicable.

## Future Path

- Reduction or revert strategy: retain the shared target-validation contract.
- Possible upstream contribution: none.
- Deferred work: non-NXVM-TODO cross-privilege validation and NXVM TODO-aligned task/gate paths.
