# M2 T2 S3 P298: Contextual RCL And RCR

## Summary

Route Group 2 rotate-through-carry instructions through the shared execution
context for 16-bit and 32-bit operand and address sizes.

## Basis

NXVM `vcpuins.c` dispatches RCL and RCR through Group 2 `C1`, `D1`, and `D3`
handlers using the active operand size. Intel IA-32 defines the carry-inclusive
rotation rings and the one-bit overflow behavior. PCjs remains the PC/AT and
whole-machine comparison reference.

## Change

The project-owned execution core adds shared 16-bit and 32-bit RCL/RCR logic,
including carry propagation, count normalization, and defined one-bit overflow
handling. The existing ModR/M decoder supplies the selected address width.

## Verification

A default-32 test covers `D1`, immediate `C1`, and CL-counted `D3` forms,
operand-size override, address-size-overridden memory access, carry, overflow,
and instruction lengths. The full project gate passes.

## Boundary

This part excludes byte forms, undefined Group 2 `/6` forms, paging
integration, devices, firmware, PC110 behavior, and M2 T3 work.
