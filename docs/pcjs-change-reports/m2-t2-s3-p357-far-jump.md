# M2 T2 S3 P357: Rebuilt Direct Far JMP

The rebuilt CPU now executes `EA` direct far JMP in real mode, including
operand-selected offset width and CS cache loading. Protected-mode selector
validation remains explicitly unimplemented.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
