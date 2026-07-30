# M2 T2 S3 P244: Contextual CMPS And SCAS

## Summary

P244 routes unprefixed default-segment CMPS and SCAS through the shared
execution context.

## Basis

PCjs is the behavioral authority for 80386 string comparison width, address
width, and EFLAGS results. Operand size determines word versus dword compare
data, while address size independently determines SI or ESI and DI or EDI.

## Change

The context selects byte, word, or dword comparison values, updates the
appropriate indexes using direction-flag deltas, and writes the matching 8-,
16-, or 32-bit subtraction flags. It does not handle repeat counts or segment
overrides.

## Verification

Tests cover default-32 CMPSD, 66-selected CMPSW, 67-selected 16-bit indexing
with dword data, and default-32 SCASD. They assert EFLAGS and resulting index
registers.

## Boundaries

REP/REPNE termination, segment overrides, device behavior, firmware, and PC110
work remain outside P244. No PCjs JavaScript or NXVM C source was copied.
