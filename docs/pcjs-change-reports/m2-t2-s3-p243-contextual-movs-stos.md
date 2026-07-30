# M2 T2 S3 P243: Contextual MOVS And STOS

## Summary

P243 routes unprefixed default-segment MOVS and STOS through the shared
execution context.

## Basis

PCjs remains the behavioral authority for 80386 string data-size and
address-size selection. The selected operand width determines MOVSW versus
MOVSD and STOSW versus STOSD, while the selected address width determines SI
or ESI and DI or EDI.

## Change

The context selects byte, word, or dword memory transfer width, independently
selects source and destination indexes, and applies direction-flag deltas using
the selected data width. Only unprefixed default-segment paths are routed.

## Verification

Tests cover default-32 MOVSD, 66-selected MOVSW, 67-selected 16-bit indexes
with dword data, and default-32 STOSD. They assert memory byte width and the
resulting source or destination register values.

## Boundaries

REP/REPNE, segment overrides, comparison strings, devices, firmware, and PC110
behavior remain outside P243. No PCjs JavaScript or NXVM C source was copied.
