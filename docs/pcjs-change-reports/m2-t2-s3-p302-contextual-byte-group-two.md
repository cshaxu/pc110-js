# M2 T2 S3 P302: Contextual Byte Group Two

## Summary

Route defined C0 byte Group 2 forms through the execution context.

## Basis

NXVM `INS_C0` implements ROL, ROR, RCL, RCR, SHL, SHR, and SAR for byte
operands and faults `/6`. Intel IA-32 defines count masking and the one-bit
overflow boundary. PCjs remains the PC/AT and whole-machine comparison source.

## Change

The project-owned CPU now decodes C0 byte operands using contextual ModR/M
address size, applies count-normalized byte operations, and retains the
existing `/6` invalid-opcode path.

## Verification

Focused tests cover ROL, RCR, SHL, SAR, carry propagation, and `67`-selected
BP memory addressing. The full project gate passes.

## Boundary

This part does not migrate D0 or D2 byte Group 2 forms, paging integration,
devices, firmware, PC110 behavior, or M2 T3 work.
