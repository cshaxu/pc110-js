# M2 T2 S3 P306: Contextual FE Byte INC DEC

## Summary

Route byte FE INC and DEC forms through the shared execution-size context.

## Basis

Intel IA-32 specifies byte INC and DEC flag behavior independently of operand
size, while 67 selects the non-default ModR/M address size. NXVM provides the
required FE instruction coverage; PCjs remains the PC/AT comparison source.

## Change

The project-owned contextual decoder now handles FE /0 and /1 using the
existing state flag writers and context-selected memory addressing.

## Verification

Focused execution coverage verifies a register INC and a 67-addressed memory
DEC in a default-32 code segment. The full project gate passes.

## Boundary

This part does not migrate F6, word/dword FF forms, devices, or M2 T3 work.
