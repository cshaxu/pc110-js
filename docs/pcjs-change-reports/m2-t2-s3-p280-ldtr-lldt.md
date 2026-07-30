# M2 T2 S3 P280: LDTR, SLDT, And LLDT

## Summary

Add LDTR CPU state, protected-mode `SLDT` and `LLDT`, and active-LDT segment
descriptor resolution.

## Basis

PCjs remains the behavioral authority. Intel 80386 LLDT loads a GDT-resident,
present LDT descriptor at CPL zero, permits a null selector to clear LDTR, and
SLDT stores the cached selector. TI-selected segment selectors resolve through
the active LDT.

## Change

The CPU snapshot now carries an independently resettable LDTR cache. The `0F
00` system selector path handles `/0` SLDT and `/2` LLDT alongside existing STR
and LTR behavior. Project-native protected segment loading receives the active
LDT table when present.

## Verification

State tests verify independent LDTR snapshot/reset behavior. An execution test
loads an LDT descriptor with LLDT, reads its selector with SLDT, then loads DS
from a TI=1 data selector through that LDT. The full project gate passes.

## Boundary

This slice excludes LLDT fault-code detail, task switching, call gates,
descriptor-cache invalidation, debug registers, devices, firmware, PC110, and
M2 T3 work.
