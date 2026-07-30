# M2 T2 S3 P452 PCjs Change Report: CPU Coverage Closure

## Summary

- Affected PCjs-derived subsystem: rebuilt 80386 CPU coverage record.
- Changed behavior: none; this part audits and records completed CPU evidence.

## Justification

- NXVM is the owner-authorized CPU coverage authority, while PCjs remains the
  whole-machine reference.
- The rebuilt ROM trace and recorded M1 browser result distinguish a completed
  CPU boundary from the remaining S5 I/O/device boundary.

## Verification

- `pnpm run trace:rebuilt-rom` reaches `F000:F907` after two instructions and
  stops only because the project-native I/O bus is unavailable.
- The recorded M1 PCjs browser verification reaches `A:\>`.
- The full project gate remains required before commit.
