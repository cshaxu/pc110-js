# M2 T2 S3 P345: Rebuilt XLAT

The rebuilt CPU now executes D7 XLAT with BX/EBX, AL indexing, address-size
selection, and segment override.

No PCjs runtime code changes. PCjs remains a differential and whole-machine
comparison authority.
