# M2 T2 S3 P339: Rebuilt SAHF And LAHF

The rebuilt CPU now executes `9E/9F` selected flag transfer between AH and
EFLAGS, including LAHF's fixed bit 1.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
