# M2 T2 S3 P335: Rebuilt MOV ModR/M Family

The rebuilt CPU now executes all `88-8B` general-register MOV ModR/M forms,
including byte, word, dword, memory, and prefix-selected addressing.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
