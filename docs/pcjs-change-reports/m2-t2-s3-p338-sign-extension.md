# M2 T2 S3 P338: Rebuilt Sign Extension

The rebuilt CPU now executes `98/99`: CBW/CWDE and CWD/CDQ, selected by the
operand size and preserving EFLAGS.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
