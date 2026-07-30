# M2 T2 S3 P343: Rebuilt C6/C7 Immediate ModR/M MOV

The rebuilt CPU now executes defined C6/C7 `/0` immediate MOV forms across
register and memory operands. Non-zero extensions remain pending `#UD` delivery.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
