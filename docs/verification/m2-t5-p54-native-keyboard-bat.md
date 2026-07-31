# M2 T5 P54 Verification

- Focused tests verify that `0x4D` releases both 8042 keyboard lines, produces
  exactly one `0xAA` BAT byte, and raises IRQ1 through the native PIC wiring.
- A held data or clock line does not produce BAT.
- Full gate: format, build, lint, tests, and `git diff --check` are required
  before commit. The next browser checkpoint must demonstrate progress beyond
  the recorded keyboard wait without synthetic guest behavior.
