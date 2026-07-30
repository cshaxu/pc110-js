# M2 T2 S3 P246: Contextual Repeat Transfer

## Summary

P246 routes F3-prefixed MOVS and STOS through the shared execution context.

## Basis

PCjs is the behavioral authority for 80386 repeat-transfer count, data, and
address-size selection. Address size selects CX or ECX and SI/ESI/DI/EDI;
operand size selects word or dword data.

## Change

The context repeats MOVS or STOS until the selected count reaches zero while
applying direction-flag deltas at the selected transfer width.

## Boundaries

F2 transfer prefixes, segment overrides, devices, firmware, and PC110 remain
outside P246. No PCjs JavaScript or NXVM C source was copied.
