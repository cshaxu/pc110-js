# M2 T2 S3 P331: Rebuilt Short Conditional Jumps

The rebuilt CPU now executes all `70-7F` rel8 conditional jumps using native
EFLAGS predicates and CS-width EIP handling. It has no device, PCjs, NXVM, or
legacy CPU runtime dependency.

No PCjs code changes. PCjs remains required for later differential and
whole-machine comparison evidence.
