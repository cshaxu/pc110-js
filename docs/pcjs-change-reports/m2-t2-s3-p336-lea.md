# M2 T2 S3 P336: Rebuilt LEA

The rebuilt CPU now executes `8D` LEA with 16/32-bit effective address and
destination widths, SIB support, and register-only form rejection.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
