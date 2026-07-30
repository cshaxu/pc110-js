# M2 T2 S3 P329 Verification: Rebuilt Register And Stack Interval

Focused tests cover every `40-5F` encoding, 16-bit and default-32 operands,
the `66` override, CF preservation, INC overflow, independent SS D/B stack
addressing, 16-bit stack wrap, and PUSH/POP ESP behavior.

The full project gate passed: format, build, lint, `git diff --check`, and all
28 test files with 410 tests.
