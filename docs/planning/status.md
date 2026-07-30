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

- M2 T2: active. Complete T2 S3 execution-size migration and the remaining
  80386 instruction and system paths, then close its ROM-trace, coverage-matrix,
  and PCjs-comparison evidence. Do not begin T3 until every T2 completion gate
  passes and the owner authorizes T3.

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

The previous M1-M13 roadmap was superseded before implementation began. M0-M5 identifiers in [breakdown.md](breakdown.md) are frozen.
