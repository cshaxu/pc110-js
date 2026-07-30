# M2 T2 S3 P288: Contextual Segment Pointers

## Summary

Route LSS, LFS, and LGS through the shared execution context.

## Basis

PCjs remains the behavioral authority and Intel 80386 remains the semantic
requirement. Operand size selects the pointer offset and destination register
width, address size selects the ModR/M effective address, and the selector is
always 16-bit.

## Change

The existing project-native segment-pointer loader is parameterized by ModR/M
offset, operand size, and address size. The contextual two-byte dispatcher now
uses it for LSS/LFS/LGS, retaining the existing protected-mode segment loader.

## Verification

A default-32 protected-mode test loads EAX and FS with LFS through a 32-bit
direct address, then loads AX and GS with `67 66 LGS` through a 16-bit direct
address. Both segment loads use a GDT data descriptor. The full project gate
passes.

## Boundary

This part does not complete all segment-load fault detail, task switching,
paging integration, devices, firmware, PC110 behavior, or M2 T3 work.
