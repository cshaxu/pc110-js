# M2 T5 P78 Verification

- Focused adapter coverage verifies `0xF2` returns `0xFA` and raises IRQ1 after
  the standard line-release/BAT exchange.
- A browser milestone run still reached the selected BDA keyboard-ring wait.
  The `0xF2` ACK is verified at the native adapter boundary but does not alone
  resolve the selected ROM's later wait.
- The full gate passed: formatting, build, lint, the full test suite, and
  `git diff --check`.
