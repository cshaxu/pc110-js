# M2 T2 S3 P330 Verification: Rebuilt Frame And Immediate Slice

Focused tests cover PUSHA original-SP ordering, POPA stack-slot discard,
default-16 and default-32 widths, `66`, 16-bit stack wrapping, signed PUSH
imm8, and 69/6B IMUL flags, ModR/M memory, `67`, and segment override.

The full project gate passed: format, build, lint, `git diff --check`, and all
29 test files with 415 tests.
