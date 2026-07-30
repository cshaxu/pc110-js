# M2 T2 S3 P418 Verification: Protected I/O Admission

Focused rebuilt tests cover scalar and string I/O with direct CPL/IOPL access,
32-bit TSS bitmap allow/deny, v86 admission, missing or 16-bit TSS rejection,
bitmap-limit rejection, and `#GP(0)` delivery before side effects. The complete
project gate passed: format, build, lint, 77 test files / 616 tests, and
whitespace verification.
