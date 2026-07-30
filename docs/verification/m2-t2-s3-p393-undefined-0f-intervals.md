# M2 T2 S3 P393 Verification: Undefined 0F Intervals

Focused tests enumerate all NXVM undefined extended opcodes, including `40-7F`
and `C0-FF`, and verify their vector-six faulting-EIP target. The full project
gate passed: format, build, lint, 76 test files / 567 tests, and whitespace
verification.
