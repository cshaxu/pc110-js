# M2 T2 S3 P352: Rebuilt Flag Control

The rebuilt CPU now executes CMC, CLC, STC, CLD, and STD through project-owned
EFLAGS state.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
