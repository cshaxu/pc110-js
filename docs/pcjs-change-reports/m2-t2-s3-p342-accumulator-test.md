# M2 T2 S3 P342: Rebuilt Accumulator TEST

The rebuilt CPU now executes `A8/A9` immediate TEST on AL or AX/EAX, with
defined logical flags and no accumulator writeback.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
