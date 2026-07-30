# M2 T2 S3 P344: Rebuilt AAM And AAD

The rebuilt CPU now executes normal D4/D5 AAM/AAD behavior. AAM base zero
remains pending architectural `#DE` delivery.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
