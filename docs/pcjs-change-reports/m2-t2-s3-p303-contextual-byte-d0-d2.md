# M2 T2 S3 P303: Contextual Byte D0 And D2

## Summary

Route D0 and D2 byte Group 2 forms through the contextual byte helper.

## Basis

NXVM `INS_D0` and `INS_D2` use the same byte Group 2 operation set as C0,
with fixed and CL counts respectively. Intel IA-32 defines RCR carry as the
outgoing low bit. PCjs remains the PC/AT and whole-machine comparison source.

## Change

The project-owned decoder reuses the C0 byte Group 2 helper for D0 and D2,
including memory addressing, count handling, and RCR carry propagation.

## Verification

Existing byte RCR regression coverage now verifies CF from the outgoing low
bit; the full project gate passes.

## Boundary

This part does not migrate D1 or D3 word/dword forms, paging integration,
devices, firmware, PC110 behavior, or M2 T3 work.
