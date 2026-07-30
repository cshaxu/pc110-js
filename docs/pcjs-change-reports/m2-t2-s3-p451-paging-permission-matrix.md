# M2 T2 S3 P451 PCjs Change Report: Paging Permission Matrix

## Summary

- Affected PCjs-derived subsystem: rebuilt 80386 page translation.
- Changed behavior: none; this part adds focused evidence for existing
  project-native page-walk behavior.

## Justification

- NXVM `_kma_physical_linear` distinguishes PDE/PTE presence, user access,
  user writes, and successful Accessed/Dirty updates.
- The rebuilt implementation needs a compact matrix proving those shared CPU
  outcomes before S3 closure can be assessed.

## Verification

- Focused tests cover PDE/PTE faults, user U/S and R/W checks, supervisor
  write behavior, fault metadata, and Accessed/Dirty updates.
- The full project gate remains required before commit.
