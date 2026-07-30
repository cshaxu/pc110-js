# M2 T2 S3 P348: Rebuilt Stack-Frame Control

The rebuilt CPU now executes C2/C3 near returns and C8/C9 ENTER/LEAVE using
project-owned stack and segment state.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
