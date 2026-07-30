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

- M2 T3 S5: active. Implement project-native system ports, NMI, reset, and A20
  glue. Preserve the verified T2 CPU oracle baseline, native PIC/PIT/DMA/RTC
  browser checkpoint, and no-PCjs-runtime boundary.

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

P365 recorded the former CPU handoff path. The owner-authorized P2 S6
correction supersedes its device-proxy method with a one-instruction PCjs CPU
differential oracle before native-device migration may begin. The harness is
not a product runtime dependency.

P366 corrected the S6 ordering record: S6 is the final T2 integration gate and
does not bypass S4 or S5.

P452 closed S3's executable NXVM CPU-coverage audit within the explicit
NXVM-TODO boundaries. The rebuilt selected-ROM trace reaches `F000:F907` and
stops only at the documented unavailable I/O-bus boundary; the M1 PCjs browser
reference reaches `A:\>`. The next eligible work is S4 final memory closure,
followed by S5 and S6.

P8 closed S4 after confirming the selected M1 physical map, A20 boundary,
immutable ROM aliases, rebuilt-runner memory-bus use, and selected-ROM trace.

P8 closed S5 after project-native width-aware port dispatch, reset, bounded
stepping, and CPU/port/stop trace evidence classified the first unavailable
ROM port without a synthetic response. S6 is now eligible.

The owner-authorized S6 correction replaces the unworkable PCjs-device-proxy
handoff with a test-only, one-instruction PCjs CPU differential harness. S6
requires a documented exclusion ledger and does not relax the later standalone
browser DOS workload: that workload must use project-owned CPU, memory, and
native devices as the M2 whole-machine completion gate.

P31 further corrects the S6 execution method: the lockstep harness has
established its initial baseline and is now a targeted diagnostic mechanism.
Browser-visible project-owned workload evidence is the primary S6 driver. The
current browser entry has only MachineRuntime controls, so it is not yet a
native firmware, storage, display, or DOS workload claim.

P32 completed the mandatory post-T2 architecture review. The rebuilt CPU's
primary and `0F` dispatch now uses a project-native typed opcode table while
retaining the existing state, decode, addressing, instruction, protection,
event, and debug boundaries. T2's full gate, selected-ROM trace, coverage
ledger, PCjs baseline, and exception register remain the T3 regression
baseline.

The previous M1-M13 roadmap was superseded before implementation began. M0-M5 identifiers in [breakdown.md](breakdown.md) are frozen.
