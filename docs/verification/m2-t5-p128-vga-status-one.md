# M2 T5 P128 Verification: VGA Input Status 1

- Focused CGA-compatibility, video-checkpoint, and machine-core tests pass
  (41 tests).
- The status tests cover reset retrace, diagnostic-bit alternation, vertical
  blank completion, horizontal retrace, selected virtual CPU clock derivation,
  and checkpoint restoration.
- Browser controlled lockstep crosses the former `F000:BB3E` difference. After
  18 bounded windows, the first remaining difference is PIT channel-one output
  state at `F000:9BF5`; timing remains matched.
- Full npm format, build, lint, test, and `git diff --check` pass before commit.
