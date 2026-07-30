# M2 T2 S3 P308: Contextual FF INC DEC

## Summary

Add FF /0 and /1 word and dword INC/DEC forms through the shared execution
context.

## Basis

Intel IA-32 defines FF /0 and /1 as operand-size-selected INC and DEC forms;
66 and 67 independently select non-default operand and address widths. NXVM
includes this Group 5 behavior. PCjs remains the PC/AT comparison source.

## Change

The project-owned execution context now decodes and executes FF /0 and /1 for
register and memory operands. It reuses existing word/dword state flag writers
and memory boundaries.

## Verification

Focused coverage verifies default-32 register INC plus 67/66-selected word
memory DEC, including EIP length and flag behavior. The full project gate
passes.

## Boundary

This part does not migrate FF near/far control transfer forms, add hardware,
or begin M2 T3.
