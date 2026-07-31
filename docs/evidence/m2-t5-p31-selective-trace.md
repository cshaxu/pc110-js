# M2 T5 P31 Selective Trace Evidence

The project-native executor now distinguishes three observation modes without
changing instruction dispatch:

- Fast Execution attaches no instruction trace hook.
- Selective Trace emits only requested ordinary instruction boundaries, while
  retaining complete fault before/after evidence and machine port/stop events.
- Full Debug retains every instruction event when a tail or CS-transfer log is
  requested by the existing ROM diagnostic command.

The bounded selected-ROM command with `PC110JS_ROM_TRACE_WATCH=f000:fff0`
completed 1,000 instructions at `F000:9C05` and reported one reset-vector hit.
Its printed identity includes mode, project commit, pinned PCjs comparison
commit, instruction budget, and optional floppy hash. No boot claim follows.

This part does not claim coverage-ledger-qualified suppression of transient
pre-fault snapshot construction, nor automatic mismatch-triggered replay.
Those remain governed future diagnostic work.
