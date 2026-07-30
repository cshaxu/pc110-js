# M2 T2 S3 P415 Verification: 16-bit TSS Privilege Stack

Focused rebuilt tests verify available-to-busy 16-bit `LTR`, a CPL3-to-CPL0
interrupt/IRET round trip through a 16-bit TSS, and a v86 interrupt/IRET round
trip through the same layout. The complete project gate passed: format, build,
lint, 76 test files / 605 tests, and whitespace verification.
