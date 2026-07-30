# M2 T2 S3 P242: Contextual LODS

## Summary

P242 routes unprefixed default-segment `LODSB`, `LODSW`, and `LODSD` through
the shared execution context.

## Basis

PCjs is the behavioral authority for the independent data-size and address-size
selection of string instructions. In the selected 80386 model, `LODSD` follows
the operand-size selection while SI or ESI follows the address-size selection.

## Change

The context selects byte, word, or dword accumulator loads and separately
selects wrapped SI or ESI indexing. Direction-flag increments and decrements
use the selected data width. Segment overrides, REP/REPNE, and LOCK remain in
their established dispatcher boundaries.

## Verification

Tests cover default-32 LODSD, 66-selected LODSW in default-32 code, and
67-selected 16-bit indexing with dword data. They assert accumulator width and
the resulting SI or ESI value.

## Boundaries

P242 does not migrate MOVS, STOS, CMPS, SCAS, repeat behavior, segment
overrides, devices, firmware, or PC110 functionality. No PCjs or NXVM source
was copied.
