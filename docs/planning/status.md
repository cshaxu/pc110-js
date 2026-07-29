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

- M2 T2 S4: active under the 2026-07-29 authorized dependency correction.
  Complete the bounded module-layout refactor and the minimal physical-memory,
  A20, and ROM-mapping path required to resume the existing S3 ROM trace.

## Delivery Nodes

- M1 PCjs reference integration: complete at immutable `m1` snapshot.
- M2 standalone TypeScript 386 golden baseline: not established.
- M3 high-ROI PC110 integration: not established.
- M4 medium- and low-ROI PC110 integration: not established.
- M5 release and preservation documentation: not started.

## Implementation State

Initial standalone emulator foundations and partial CPU implementation exist.
Protected ROM and disk images are not tracked.

M2 T2 S3 is paused after P16. Its observed reset-ROM path reaches a far jump
into low RAM, so the minimal S4 memory path is an explicit prerequisite for
continuing CPU opcode work. This is the only authorized sequencing exception;
the M2 objective and completion gate are unchanged.

The previous M1-M13 roadmap was superseded before implementation began. M0-M5 identifiers in [breakdown.md](breakdown.md) are frozen.
