# M2 T2 S3 P386 Verification: Rebuilt System-Selector Privilege

Focused tests verify nonzero-CPL LLDT and LTR deliver `#GP(0)` before changing
LDTR or TR state. The full project gate passed: format, build, lint, 75 test
files / 558 tests, and whitespace verification.
