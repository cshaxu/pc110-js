# M2 T2 S3 P357 Verification: Rebuilt Direct Far JMP

Focused tests cover the DeskPro reset-vector target, 16/32-bit offset forms,
CS cache loading, and fault-EIP preservation at the protected-mode boundary.

The full project gate passed: format, build, lint, `git diff --check`, and all
tests.
