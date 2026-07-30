# M2 T2 S3 P343 Verification: Rebuilt C6/C7 Immediate ModR/M MOV

Focused tests cover byte/word/dword register and memory destinations, `66`,
`67`, segment override, EIP length, and the pending-`#UD` boundary.

The full project gate passed: format, build, lint, `git diff --check`, and all
42 test files with 447 tests.
