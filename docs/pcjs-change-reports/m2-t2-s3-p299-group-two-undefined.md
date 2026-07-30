# M2 T2 S3 P299: Group 2 Undefined Forms

## Summary

Route Group 2 `/6` encodings through the project-owned invalid-opcode fault
path.

## Basis

NXVM `INS_C0`, `INS_C1`, `INS_D0`, `INS_D1`, `INS_D2`, and `INS_D3` each map
the `/6` field to `UndefinedOpcode()`. Intel IA-32 defines these Group 2 forms
as undefined. PCjs remains the PC/AT and whole-machine comparison reference.

## Change

The prefix-aware decoder detects `/6` before any width-specific Group 2
execution path and delivers vector 6 using the original instruction pointer.

## Verification

Focused real-mode tests cover all six opcodes, including their immediate forms,
and verify the vector target, stack location, and saved faulting EIP. The full
project gate passes.

## Boundary

This part does not broaden byte or word rotate and shift functionality, add
devices, or implement M2 T3 hardware.
