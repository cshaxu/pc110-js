# Project Status

## Completed

- M0: Governance And Project Foundation.
- M0 T3 S1 P2: owner-authorized four-node delivery-model correction.
- M0 T3 S1 P3: durable root agent guidance for long-running execution.
- M0 T3 S1 P4: task tracking protocol and initial M0 T3 record.
- M0 T3 S1 P5: M1 browser reference-run completion gate.
- M0 T3 S1 P6: M1-M5 milestone snapshot-branch protocol.
- M0 T3 S1 P7: committed M1-to-M2 goal specification.

## Next Eligible Work

- M2 T2: active. Reconstruct the project-native CPU in NXVM opcode-family
  order; the frozen legacy/reference CPU remains differential evidence only.
  Close ROM-trace, coverage-matrix, and PCjs-comparison evidence before T3.
  Do not begin T3 until every T2 completion gate passes and the owner
  authorizes T3.

## Delivery Nodes

- M1 PCjs reference integration: complete at immutable `m1` snapshot.
- M2 standalone TypeScript 386 golden baseline: not established.
- M3 high-ROI PC110 integration: not established.
- M4 medium- and low-ROI PC110 integration: not established.
- M5 release and preservation documentation: not started.

## Implementation State

Initial standalone emulator foundations and partial CPU implementation exist.
Protected ROM and disk images are not tracked.

M2 T2 S3 resumed after P16. Its observed reset-ROM path reaches a far jump into
low RAM, so the minimal S4 memory path was an explicit prerequisite for
continuing CPU opcode work. S4 P4 verified that path through mapped ROM. This
was the only authorized sequencing exception; the M2 objective and completion
gate are unchanged.

P320 froze the verified incremental CPU at `cpu-legacy-reference` commit
`26bd074` and changed the active S3 method to a clean project-native TypeScript
reconstruction in NXVM opcode-family order. No runtime behavior changed.

P328 clarified the delivery cadence: rebuilt CPU work now advances through
NXVM-driven large numeric opcode intervals or complete families with execution
behavior, rather than standalone infrastructure parts. P327 remains a partial
`00-3F` execution slice with its protection dependencies recorded in the
ledger.

P364 corrected the execution-governance conflict: integration and device work
retains breadth-first ROI delivery, while CPU and other architecture-closure
work follows its authority and coverage ledger. NXVM is the decisive M2 T2 CPU
behavior authority; PCjs remains the PC/AT and whole-machine comparison source.

P365 records the required CPU handoff path. S3 closes NXVM CPU coverage first;
M2 T2 S6 then proves the rebuilt CPU as the sole executing CPU in a
verification-only PCjs-assisted harness before native-device migration may
begin. The harness is not a product runtime dependency.

The previous M1-M13 roadmap was superseded before implementation began. M0-M5 identifiers in [breakdown.md](breakdown.md) are frozen.
