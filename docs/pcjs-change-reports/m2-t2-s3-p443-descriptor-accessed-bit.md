# M2 T2 S3 P443 PCjs Change Report: Descriptor Accessed-Bit Writeback

## Summary

- Affected PCjs-derived subsystem: rebuilt protected segment loading.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: successful protected segment loads set the descriptor Accessed bit.
- Active milestone need: retain guest-visible descriptor state after code, data, and stack loads.

## Justification

- Why configuration is insufficient: descriptor writeback is CPU-core behavior.
- Why a pc110-js adapter or profile wrapper is insufficient: all generic protected-mode consumers share the loader.
- Evidence supporting the change: NXVM `_ksa_load_sreg` sets and writes the Accessed bit after validation.
- Compatibility risk: descriptor-table memory changes only after a successful segment load.

## Implementation Boundary

- Source and destination files: rebuilt descriptor lookup and segment-loader modules.
- Mechanical migration separated from behavior change: no PCjs source was moved.
- Generic PC/AT impact: GDT and active-LDT descriptors reflect successful use.
- PC110-specific impact: none.

## Verification

- Focused tests: GDT code/data/stack and active-LDT data descriptors become accessed; rejected descriptors remain unchanged.
- Unmodified PCjs comparison: not required for this bounded CPU-core writeback.
- Generic PC/AT boot regression: retained by the full gate.
- PC110 regression, when established: not applicable.
- Manual browser result: not applicable.

## Future Path

- Reduction or revert strategy: retain the writeback with the shared loader.
- Possible upstream contribution: none.
- Deferred work: complete descriptor fault classification and NXVM TODO-aligned task/call gates.
