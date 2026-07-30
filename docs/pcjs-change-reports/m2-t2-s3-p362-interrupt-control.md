# M2 T2 S3 P362: Rebuilt Interrupt Control

This change adds project-native IVT/IDT gate delivery for rebuilt INT3, INT,
INTO, and same-privilege IRET. It changes no PCjs file and imports no PCjs
runtime code. PCjs remains a comparison authority for later whole-machine and
outer-privilege interrupt behavior.
