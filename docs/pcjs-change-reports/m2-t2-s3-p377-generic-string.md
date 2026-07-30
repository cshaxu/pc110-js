# M2 T2 S3 P377: Rebuilt Generic String Instructions

This change adds project-native MOVS, CMPS, STOS, LODS, and SCAS execution.
It changes no PCjs source and imports no PCjs runtime code. PCjs remains a
comparison authority for later whole-machine and string fault validation.
