# M2 T2 S3 P334: Rebuilt XCHG ModR/M Family

The rebuilt CPU now executes `86/87` XCHG for byte, word, and dword register
and memory operands, preserving EFLAGS.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
