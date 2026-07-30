# M2 T2 S3 P347: Rebuilt Near CALL And JMP

The rebuilt CPU now executes E8 near CALL, E9 near JMP, and EB short JMP with
relative displacement and operand-selected return-frame width.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
