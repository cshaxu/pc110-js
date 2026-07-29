# M2 T2 S3 P221: Protected-Mode Memory Far CALL

## Summary

This change adds the same-privilege, 16-bit protected-mode form of `CALL FAR m16:16`
(`FF /3`). It reads the far pointer through the existing ModR/M memory path, validates its
target code segment, then pushes the return selector and instruction pointer through the
existing 16-bit stack path.

## Basis

PCjs is the behavioral authority for M2. Its x86 far-call path establishes that immediate and
memory far-call encodings share the same return-frame and code-segment-transfer semantics. The
local implementation reuses the project-owned descriptor resolver and segment application
helpers rather than copying PCjs source code.

## Scope And Risk

The implemented path is limited to a protected-mode target at the current privilege level with
a 16-bit memory pointer. Descriptor resolution happens before either stack write, preserving an
unchanged frame when target validation fails. Real-mode behavior remains unchanged.

Call gates, privilege changes and TSS stack switching, virtual-8086 mode, address-size and
operand-size-overridden far-call forms, and segment-override dispatch remain deferred.

## Verification

The focused execution test verifies ModR/M pointer loading, descriptor-backed target loading,
the resulting `EIP`, and both words of the 16-bit return frame. The normal repository gates run
before this part is committed.
