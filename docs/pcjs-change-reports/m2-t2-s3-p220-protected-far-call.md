# M2 T2 S3 P220: Protected-Mode Far CALL

## Summary

This change adds the same-privilege, 16-bit protected-mode form of `CALL FAR ptr16:16` (`9A`).
It resolves and validates the target code-segment descriptor before modifying the stack, then
pushes the return selector and instruction pointer through the existing 16-bit stack path.

## Basis

PCjs is the behavioral authority for M2. Its x86 `opCALLF` implementation establishes that a
far call must preserve a return far pointer and transfer through the ordinary code-segment
loading path. The local implementation uses the existing descriptor resolver and protected
segment application helpers introduced for the adjacent far-transfer work, rather than copying
PCjs source code.

## Scope And Risk

The implemented path is limited to a protected-mode target at the current privilege level with
a 16-bit immediate offset. Target validation happens before either return word is pushed, so an
invalid descriptor cannot leave a partial far-call frame. Real-mode behavior remains unchanged.

Call gates, privilege changes and TSS stack switching, virtual-8086 mode, and the remaining
far-call forms remain explicitly deferred. Those paths require their own PCjs-based behavioral
review and tests.

## Verification

The focused execution test verifies the target code segment, resulting `EIP`, and both words of
the 16-bit return frame. The normal formatter, build, lint, full test, and diff checks are run
before this part is committed.
