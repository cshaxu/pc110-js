# Execution Policy

This policy governs milestone and goal-mode execution.

## Unit Of Work

- Exactly one subtask is active at a time.
- A goal may continue through multiple parts of that subtask.
- Crossing into the next subtask requires that its entry conditions and acceptance criteria are already defined.
- Do not silently broaden a subtask to absorb an architectural redesign, complete-device investigation, or unrelated cleanup.
- Parts are small implementation commits numbered from 1 within the subtask.

## Goal Specifications

A long-running goal may reference a committed file under `docs/goals/`. The
goal prompt must name that file and state the authorized milestone boundary.
The file revision present at goal start is binding. Do not change the file to
broaden the active goal; request owner authorization and an explicit goal update
instead.

## Required Subtask Record

Before implementation, record:

- objective and non-goals;
- dependencies and required local assets;
- exact source baseline and provenance impact;
- expected files or behavioral surface;
- exact verification commands;
- manual browser check, when applicable;
- completion evidence;
- stop conditions and escalation conditions.

Create or update the task tracking file at
`docs/tracking/M<milestone>-T<task>.md`. It must contain a section for the
active subtask and receive a concise `P<part>` entry in the same commit as each
change to that subtask.

The canonical breakdown may provide these directly. Otherwise add a short execution note under `docs/planning/subtasks/` before code changes.

## Completion Standard

A subtask is complete only when:

- its scoped behavior is implemented;
- required automated checks pass;
- required manual checks pass;
- the latest achieved boot baselines still pass;
- provenance, evidence, TODOs, Quick Start, and third-party notices are updated where affected;
- a compact English verification record exists under `docs/verification/`;
- the relevant `docs/tracking/M<milestone>-T<task>.md` subtask section records the completed part and verification state;
- the working tree is reviewed for accidental protected assets and unrelated changes;
- the commit follows M/T/S/P format and is pushed to the canonical remote.

Push is a completion action, not a separate product subtask.

## Milestone Snapshot Branches

M1 through M5 each require a preservation snapshot before work begins on the
next milestone.

1. Complete and verify the milestone completion gate on `main`.
2. Push the final verified `main` commit to `origin`.
3. Create `m<milestone>` from that exact `main` commit and push it to `origin`.
4. Verify that `main`, `m<milestone>`, and `origin/m<milestone>` resolve to the
   same commit.
5. Record the branch, remote push, and verification result in the active task
   tracking section and milestone verification record. Git ref equality is the
   authority for commit identity; a literal SHA may be recorded in the first
   post-snapshot transition commit on `main` without moving the snapshot.
6. Continue development on `main` only.

Snapshot branches are immutable preservation references. Do not move, merge
into, or develop on them without explicit owner authorization. A goal may enter
the next milestone only when it explicitly authorizes that transition and the
preceding snapshot process has completed.

## Boot Baselines

- Before M1 completes, no boot baseline is claimed.
- M1 establishes the sibling PCjs reference baseline.
- M2 establishes the standalone TypeScript 80386 PC/AT golden baseline.
- M3 establishes the high-ROI PC110 boot and usability baseline.
- M4 establishes the expanded PC110 hardware baseline.
- Each later subtask preserves every applicable established baseline.

## Execution Strategy Classification

Classify a subtask before selecting its implementation unit. The product ROI
chooses the next capability; the subtask class chooses the execution method.

### Integration And Device Work

Integration and device work defaults to breadth-first, ROI-led delivery:

- Prefer the smallest change that advances an observable whole-machine checkpoint.
- Keep unknown behavior visible in traces.
- Classify one blocker before implementing one blocker.
- Time-box exploratory tracing through explicit instruction, cycle, output, or experiment-count limits.

### Architecture-Closure Work

CPU execution, address translation, segmentation, exceptions, interrupts, and
other shared architectural substrates are architecture-closure work. They must
follow their approved authority, coverage ledger, and semantic-family plan.
Do not use a single observed ROM path, opcode, ModR/M extension, or local
blocker as the default implementation unit. A trace may expose a dependency or
validate progress, but it cannot narrow the required family coverage.

For M2 T2 S3, NXVM `vcpu.h` and `vcpuins.c` define CPU coverage and instruction
behavior. The reconstruction plan and opcode ledger are binding over this
default policy. Split a family only for a genuine architectural dependency and
record the dependency before implementation.

### Hybrid Work

Memory mapping, I/O dispatch, and machine composition may have both classes of
work. A bounded integration prerequisite is permitted only when it is recorded
as a dependency correction; it does not authorize unrelated device behavior or
reduce the architecture-closure completion gate.

For every class, defer nonblocking questions with evidence and activation
conditions. Do not replace missing hardware with firmware, BIOS, DOS,
filesystem, or application behavior.

## PCjs-Assisted Differential Policy

For the architecture boundary and selected-profile M2 completion scope, follow
[Architecture Authority And M2 Convergence](../governance/architecture-authority.md).

The project maintains two distinct PCjs uses:

- The M1 reference machine runs the pinned PCjs CPU and devices as a read-only
  comparison baseline.
- The final M2 T2 S6 PCjs differential harness runs only after the S3 CPU, S4
  memory, and S5 I/O/reset/stepping gates close. It advances the project-native
  rebuilt CPU and a read-only PCjs CPU oracle one instruction each from
  independent equivalent state, then compares normalized architectural and
  side-effect snapshots.

The harness is a test-only dependency. PCjs CPU execution is allowed only as
the isolated oracle; it must not be presented as the standalone product
baseline. The product runtime must not import the legacy CPU, NXVM, PCjs CPU,
or PCjs devices. Its required evidence is instruction-level comparison with a
case-by-case exclusion ledger and the project-owned selected-ROM trace.

For a whole-machine mismatch that cannot be classified from short checkpoints
or transaction tails, use the bounded controlled-lockstep diagnostic defined
in [M2 T5 Controlled Lockstep](m2-t5-controlled-lockstep.md). It advances the
project-native and PCjs machines from equivalent diagnostic state by an
explicit instruction or cycle budget, then compares normalized state at the
instruction boundary. The PCjs diagnostic control plane exists only on its
local `pc110` branch; it must never be imported by the product runtime.

Whole-machine diagnostics must converge by bounded batch comparison, batch
reduction, then instruction-level first-difference replay. Independent long
native and PCjs browser runs are milestone evidence only and cannot by
themselves justify a behavior correction.

After the harness passes, every M2 T3 through M4 native-device migration must
add a project-owned device or tightly coupled device group, rerun the relevant
focused and whole-machine workload, and preserve the standalone browser DOS
completion path. No native device may claim integration completion from
isolated tests alone.

## Trace Diagnostic And Replay Policy

Follow [Trace Diagnostic And Replay Policy](../governance/trace-diagnostic-policy.md)
for performance-sensitive CPU tracing, ROM diagnostics, and differential
investigation.

- Fast execution is the default product and browser-workload mode; it does not
  retain per-instruction full-state snapshots.
- Selective trace may suppress complete snapshots only for a coverage-ledger
  verified opcode family in its verified execution context. It remains an
  observation policy and must not change emulation semantics.
- A diagnostic mismatch or unexpected machine boundary requires deterministic
  full-debug replay of the bounded interval. It may not be hidden by adding an
  exclusion.
- Do not use host wall time, timer forcing, synthetic interrupts, or delay-loop
  skipping as ordinary performance optimization.

## Browser Resource Budget

Browser verification is a constrained local resource, not an unlimited test
surface.

- Reuse an existing relevant Codex browser tab before opening a new one.
- Keep at most one tab open for ordinary verification. A second tab is allowed
  only while an active, bounded native-versus-PCjs comparison needs both live
  pages.
- Before CPU-intensive browser execution, close every tab that is not required
  for that specific check. Close or finalize the remaining verification tabs as
  soon as the evidence has been recorded.
- If the control surface cannot close a tab, stop opening additional tabs and
  reuse an already controlled tab.
- Browser-tab count does not relax the existing Fast Execution, selective
  tracing, deterministic replay, or no-shortcut rules.

## Escalation Conditions

Stop and request owner direction when:

- evidence requires a material architecture or milestone change;
- a requested source or asset lacks a usable license;
- protected media would need to be committed or redistributed;
- complete 80486 conformance becomes necessary rather than a bounded PC110 delta;
- the last known-good boot baseline cannot be restored within the active subtask;
- reference evidence materially conflicts and no bounded experiment can resolve it.

## Planning Stability

- Do not renumber completed or active milestone, task, or subtask identifiers.
- Add newly discovered work at the end of the closest suitable task or as a new task.
- The owner-authorized pre-implementation correction in M0 T3 S1 P2 supersedes the earlier M1-M13 roadmap.
- M0-M5 identifiers are frozen after that correction.
- Update [status.md](status.md) whenever active work or milestone state changes.
