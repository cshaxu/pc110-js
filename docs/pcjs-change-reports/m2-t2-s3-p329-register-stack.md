# M2 T2 S3 P329: Rebuilt Register And Stack Interval

The rebuilt CPU now executes the complete register-only `40-5F` interval:
INC, DEC, PUSH, and POP for all eight general registers. This follows NXVM's
CPU handler coverage while using project-native TypeScript state, arithmetic,
and stack contracts.

No PCjs code or runtime path is changed. PCjs remains a later differential and
whole-machine comparison authority. The interval has no ModR/M, `67`, memory
operand, privilege, or protection-fault form.
