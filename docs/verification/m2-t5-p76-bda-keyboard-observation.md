# M2 T5 P76 Verification

- Focused checkpoint coverage writes known BDA pointer bytes and verifies their
  displayed little-endian values without mutation by `snapshot()`.
- A browser milestone run reached `F000:DCAC` without instruction tracing. It
  reported `HEAD=TAIL=001E` while the native 8042 reported `CMD 5D`, `KBD 0`,
  and `SCAN 0`, proving no new key reached the guest BDA ring.
- The full gate passed: formatting, build, lint, the full test suite, and
  `git diff --check`.
