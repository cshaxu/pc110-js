# M2 T2 S3 P222: Protected-Mode Far RET

## Summary

This change adds same-privilege, 16-bit protected-mode `RETF` and `RETF imm16`
(`CB` and `CA iw`). It validates the return selector from the existing 16-bit stack frame
before removing the frame, then restores the code segment and instruction pointer.

## Basis

PCjs is the behavioral authority for M2. Its x86 far-return path establishes that the return
selector and offset are read from the stack and that the resulting selector receives normal
protected-mode code-segment validation. The local implementation applies this behavior through
the project-owned stack, descriptor resolver, and segment application boundaries.

## Scope And Risk

The implemented path is limited to same-privilege protected-mode returns on a 16-bit stack.
It validates the selector before popping either return word. The existing real-mode behavior
remains unchanged.

Privilege returns and their stack transitions, call gates, virtual-8086 mode, and 32-bit-stack
handling remain deferred to separate PCjs-reviewed work.

## Verification

The focused execution regression performs a 16-bit protected-mode far call into a target that
executes `RETF`, then verifies the restored code segment, return address, and stack pointer.
The normal repository gates run before this part is committed.
