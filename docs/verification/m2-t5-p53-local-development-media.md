# M2 T5 P53 Verification

- A loopback Vite server with explicit environment media paths returned the
  selected system ROM (32,768 bytes), VGA ROM (24,576 bytes), and floppy
  image (1,474,560 bytes).
- The `?dev-media=1` page exposed the local-media control. Activating it
  passed the normal descriptor validation and showed native floppy state
  `D0 1:0` at reset.
- Focused asset-loader tests, format, build, lint, tests, and
  `git diff --check` are required before commit.
