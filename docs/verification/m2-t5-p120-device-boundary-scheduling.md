# M2 T5 P120 Verification

- Focused PIT, core, and native-lockstep checkpoint tests verify the queued
  device work is reversible and bulk execution flushes its final work item.
- Full npm format, build, lint, test, and `git diff --check` are required.
- Settled browser lockstep must cross `F000:BB1B`, `F000:BB19`, and
  `F000:BB26` or record the next first behavioral difference.
