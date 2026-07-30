# M2 T2 S3 P279: ARPL

## Summary

Add protected-mode `ARPL r/m16, r16` (`63 /r`) through the project-native
execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 ARPL compares selector RPLs,
raises the destination RPL when needed, and sets ZF only when it adjusts the
destination. ARPL is invalid outside protected mode.

## Change

The new context path handles register or memory destinations with either ModR/M
address width. A generic CPU-state ZF writer avoids tying ARPL behavior to
bit-scan terminology. Real and virtual-8086 mode use existing vector-six fault
delivery.

## Verification

Focused protected-mode tests verify default 32-bit and `67` memory addresses,
RPL adjustment, unchanged selectors, ZF, and EIP. A real-mode fixture verifies
vector-six delivery with the faulting IP. The full project gate passes.

## Boundary

This slice excludes task switching, LDT use, general privilege-model expansion,
devices, firmware, PC110, and M2 T3 work.
