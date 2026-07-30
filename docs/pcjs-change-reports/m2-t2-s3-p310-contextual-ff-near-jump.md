# M2 T2 S3 P310: Contextual FF Near Jump

## Summary

Route FF /4 near jumps through the shared execution-size context.

## Basis

Intel IA-32 selects the near-jump target width from the operand size and the
ModR/M address width independently. NXVM includes FF Group 5 near jumps. PCjs
remains the PC/AT comparison source.

## Change

The project-owned contextual decoder now executes FF /4 register and memory
targets, loading IP or EIP at the context-selected operand width.

## Verification

Focused coverage verifies default-32 and 66-selected word register jumps. The
full project gate passes.

## Boundary

This part does not migrate FF far jumps or calls, add hardware, or begin M2
T3.
