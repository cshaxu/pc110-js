# M2 T2 S3 P282: Contextual System Tables

## Summary

Route the existing `0F 01` descriptor-table and machine-status-word forms
through the shared execution context.

## Basis

PCjs remains the behavioral authority and Intel 80386 remains the semantic
requirement. Operand size selects the LGDT/LIDT base width, while address size
selects the ModR/M effective address. SMSW and LMSW transfer 16-bit machine
status words.

## Change

The project-native helper now handles existing SGDT, SIDT, LGDT, LIDT, SMSW,
and LMSW behavior with explicit ModR/M offset, operand size, and address size.
The two-byte contextual dispatcher calls it after prefix decoding. Existing
privilege checks and descriptor-table state interfaces remain unchanged.

## Verification

A default-32 protected-mode test loads GDTR through a 32-bit direct address,
then uses `67 SGDT` to store the resulting table through a 16-bit direct
address. It verifies base width, stored bytes, and EIP length. The full project
gate passes.

## Boundary

This part does not complete `0F 01`, descriptor validation, system-instruction
fault detail, task switching, debug registers, paging integration, devices,
firmware, PC110 behavior, or M2 T3 work.
