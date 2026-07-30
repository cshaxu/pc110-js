# M2 T2 S3 P340: Rebuilt Immediate Register MOV

The rebuilt CPU now executes every `B0-BF` immediate general-register MOV
encoding, including `66` dword forms.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
