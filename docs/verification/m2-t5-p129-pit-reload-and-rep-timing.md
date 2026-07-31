# M2 T5 P129 Verification: PIT Reload and REP Timing

- Focused cycle-estimator, runner, string, PIT, PC/AT PIT, and machine-core
  tests pass (55 tests).
- PIT tests cover mode-2 count-one low output, subsequent reload, and
  instruction-boundary phase rebasing with checkpoint-safe per-counter state.
- Runner tests retain the REP continuation timing state through reset,
  interrupt, and machine checkpoint paths.
- Browser controlled lockstep crosses the prior PIT1 and CPU timing boundaries.
  Thirty-two bounded windows (512 boundaries) complete with matched timing.
- Full npm format, build, lint, test, and `git diff --check` pass before commit.
