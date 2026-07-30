# M2 T2 S3 P337: Rebuilt Accumulator XCHG

The rebuilt CPU now executes `90-97`: NOP plus AX/EAX exchange with all other
general registers, preserving EFLAGS.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
