# M2 T2 S3 P353: Rebuilt 0F Near Jcc

The rebuilt CPU now decodes the 0F escape and executes 0F 80-8F near
conditional jumps through project-owned state.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
