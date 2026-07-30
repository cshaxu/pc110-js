# M2 T2 S3 P254: Contextual Near Conditional Jump

## Summary

P254 routes `0F 80..8F` through the shared execution context.

## Basis And Change

PCjs remains the behavior authority: CS default size and 66 select word or
dword signed displacement and IP or EIP target width. Existing condition
predicates remain unchanged in the project-native implementation.

## Boundaries

Short branches, devices, firmware, and PC110 behavior remain outside P254. No
PCjs JavaScript or NXVM C source was copied.
