# M2 T2 S3 P256: Contextual Immediate ModR/M MOV

## Summary

P256 routes `C6 /0` and `C7 /0` through the shared execution context.

## Basis And Change

PCjs remains the behavior authority: CS default size and 67 select ModR/M
address width, while CS default size and 66 select C7 word or dword data and
immediate length. C6 remains byte data with context-selected addressing.

## Boundaries

Other ModR/M immediate groups, devices, firmware, and PC110 behavior remain
outside P256. No PCjs JavaScript or NXVM C source was copied.
