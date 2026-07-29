# Execution Policy

This policy governs milestone and goal-mode execution.

## Unit Of Work

- Exactly one subtask is active at a time.
- A goal may continue through multiple parts of that subtask.
- Crossing into the next subtask requires that its entry conditions and acceptance criteria are already defined.
- Do not silently broaden a subtask to absorb an architectural redesign, complete-device investigation, or unrelated cleanup.
- Parts are small implementation commits numbered from 1 within the subtask.

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

## Boot Baselines

- Before M1 completes, no boot baseline is claimed.
- M1 establishes the sibling PCjs reference baseline.
- M2 establishes the standalone TypeScript 80386 PC/AT golden baseline.
- M3 establishes the high-ROI PC110 boot and usability baseline.
- M4 establishes the expanded PC110 hardware baseline.
- Each later subtask preserves every applicable established baseline.

## Breadth-First Rules

- Prefer the smallest change that advances an observable whole-machine checkpoint.
- Keep unknown behavior visible in traces.
- Classify one blocker before implementing one blocker.
- Time-box exploratory tracing through explicit instruction, cycle, output, or experiment-count limits.
- Defer nonblocking questions with evidence and activation conditions.
- Do not replace a missing hardware model with firmware, BIOS, DOS, filesystem, or application behavior.

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
