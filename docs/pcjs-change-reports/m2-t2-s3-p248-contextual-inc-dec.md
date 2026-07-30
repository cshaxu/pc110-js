# M2 T2 S3 P248: Contextual Register INC And DEC

## Summary

P248 routes `40..4F` register increment and decrement forms through the shared
execution context.

## Basis And Change

PCjs remains the behavior authority: CS default size and 66 select word or
dword register width, while INC and DEC preserve CF. The shared path selects
the matching register and flag-width methods.

## Boundaries

Memory, ModR/M, devices, firmware, and PC110 behavior remain outside P248. No
PCjs JavaScript or NXVM C source was copied.
