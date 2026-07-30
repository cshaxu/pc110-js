# M2 T2 S3 P431 Verification: NXVM Prefix And Decode-Length Closure

Focused tests cover all prefix defaults and overrides plus a 14-prefix escaped
opcode whose sixteenth byte attempts to exceed the instruction window. The
rebuilt executor delivers `#GP(0)` at the instruction-start EIP. The complete
project gate passed: format, build, lint, tests, and whitespace verification.
