# Trace Diagnostic And Replay Policy

Trace and differential facilities are verification instrumentation. They must
not alter guest-visible execution semantics, device time, interrupt delivery,
or the product runtime dependency boundary.

## Semantic Boundary

- The emulator advances virtual device time from project-native CPU cycle
  accounting and device contracts, never from host wall time.
- A performance mode must not force a timer transition, inject an interrupt,
  skip a firmware delay, synthesize an I/O response, alter firmware bytes, or
  replace a guest service with a host operation.
- PCjs, NXVM, legacy/reference CPU code, and a differential oracle remain
  verification-only. They are never product-runtime fallbacks.
- A trace policy may reduce observation data only. It must not select a
  different instruction handler or change the effects of the selected handler.

## Diagnostic Modes

### Fast Execution

Fast execution is the default for browser workloads and long ROM runs. It
executes the project-native core without per-instruction full-state snapshots.
It may retain bounded counters, selected coverage markers, replay identity,
and verified checkpoints needed for normal UI presentation. An instruction
budget in the hundreds of millions is milestone evidence only: use at most one
Fast run to establish a newly observed whole-machine boundary, not as normal
CPU or device development workflow.

### Selective Trace

Selective trace records complete before/after state only for explicitly
eligible diagnostic boundaries. It may record lightweight instruction markers
elsewhere. Eligible boundaries include:

- an opcode family or execution-context class not yet verified by the coverage
  ledger or differential evidence;
- control transfer, privilege transition, exception, interrupt, fault, paging,
  segmentation, or task-switch behavior;
- port I/O, DMA, IRQ, memory watchpoint, ROM mapping transition, or an
  unclassified device access;
- REP/string behavior, a registered compatibility exception, or an explicit
  owner/developer watchpoint.

Eligibility must be keyed by opcode family plus relevant execution context,
not by a bare opcode byte. Relevant context includes operand/address/stack
width, prefixes, ModR/M form, CPU mode, privilege level, and memory or I/O
side effects where applicable.

A verified instruction family may be excluded from complete snapshots only
when its applicable context is recorded in the coverage ledger and its focused
and differential evidence remain green. Unknown or uncovered context defaults
to selective capture rather than exclusion.

Do not use Selective Trace for an ordinary long ROM run. Routine CPU and device
work uses short programs, differential harnesses, and short ROM checkpoints.
When Fast execution reaches a mismatch or unexpected boundary, replay from the
nearest verified checkpoint with Full Debug over only the bounded interval.

### Full Debug Replay

A diagnostic trigger requires a deterministic replay with complete capture for
the bounded failing interval. Triggers include a differential mismatch,
unimplemented instruction, unexpected exception, unexpected device access,
unmapped port or memory stop, assertion failure, or explicit watchpoint.

The original fast/selective run must retain enough replay identity to reproduce
the interval: project commit, machine configuration, ROM and media hashes,
reset seed/checkpoint, virtual instruction or cycle position, and host input
event order. The replay may begin from reset or a verified checkpoint. It must
not infer missing earlier state from a partial trace.

If a full replay still disagrees with the applicable authority, record the
result in the coverage ledger and provenance. Use
`docs/governance/compatibility-exceptions.md` only for a minimized,
authority-supported, scoped difference. Do not silently downgrade the mismatch
to an excluded trace class.

## Performance Requirements

- Trace buffers, event journals, and snapshots must be bounded by an explicit
  capacity or checkpoint policy. A long ROM run must not retain every event by
  default.
- Instrumentation overhead must be measured separately from emulator behavior.
  Benchmark reports state whether fast, selective, or full-debug mode was used.
- Performance optimization may batch host scheduling, rendering, or diagnostic
  collection only when virtual cycle ordering and device observations remain
  unchanged.
- A proposed acceleration that recognizes and skips a guest delay loop is a
  semantic change, not a trace optimization. It requires separate owner
  authorization, authority evidence, a scoped compatibility record, and
  equivalence tests; it is not permitted as ordinary M2 execution work.

## Verification And Records

For each trace-policy implementation or material policy change:

1. Add focused tests showing fast and selective modes produce identical
   architectural state, memory/device effects, virtual cycles, and stop reason
   for the same bounded program.
2. Test that every diagnostic trigger requests or enters a reproducible
   full-debug replay without changing the original execution result.
3. Preserve the selected ROM trace, M1 comparison, and applicable browser
   workload evidence.
4. Record any approved differing result in the sole compatibility-exceptions
   register, not in an exclusion list alone.
5. Update the active task tracking, provenance, PCjs change report when
   relevant, and a compact verification record in the same verified part.

## Non-Goals

This policy does not authorize a BIOS, DOS, guest-service, filesystem, or
device workaround. It does not replace the M2 CPU coverage ledger, PCjs
differential gate, native browser workload gate, or device-specific timing
validation.
