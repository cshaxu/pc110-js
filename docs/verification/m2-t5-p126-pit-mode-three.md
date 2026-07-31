# M2 T5 P126 Verification: PIT Mode 3

- Focused PIT tests cover mode-3 zero reload, even and odd visible-count
  sequences, output transitions, latching, and capture/restore.
- Focused PC/AT PIT and machine-core tests remain green.
- After stable reset, browser lockstep crosses the former `F000:BB27` PIT0
  difference with matched CPU cycles and device state. The next first
  difference is CPU EAX at `F000:BB3A`, both sides at 914 cycles.
- Full npm format, build, lint, test, and `git diff --check` are required.
