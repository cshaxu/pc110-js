# M2 T5 P71 Verification

- Focused adapter coverage writes command byte `0x5D`, sends reset `0xFF` to
  port `0x60`, and verifies clock release, ordered `0xFA`/`0xAA`, and IRQ1.
- Format, build, lint, full test suite, and `git diff --check` pass: 125 test
  files and 908 tests.
- Browser revalidation is required before this part can claim a new
  whole-machine boundary.
