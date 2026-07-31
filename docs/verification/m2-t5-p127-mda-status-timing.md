# M2 T5 P127 Verification: MDA Status Timing

- Focused MDA, video-checkpoint, and machine-core tests pass (41 tests).
- The MDA tests cover reset retrace, vertical-blank completion, horizontal
  retrace, frame wrap, and an alternate virtual CPU clock.
- Browser controlled lockstep, after loading verified local media and resetting
  the boundary, reports `Lockstep window matched: 16 boundaries; timing matched`.
- Full npm format, build, lint, test, and `git diff --check` pass before commit.
