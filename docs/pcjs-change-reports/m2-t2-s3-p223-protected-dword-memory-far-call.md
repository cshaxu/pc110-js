# M2 T2 S3 P223: Protected-Mode 32-Bit Memory Far CALL

## Summary

This change adds the same-privilege, 32-bit protected-mode form of `CALL FAR m16:32`
(`66 FF /3`) with the existing 16-bit ModR/M addressing path. It reads the 32-bit offset and
16-bit selector from memory, validates the target segment, then pushes the 32-bit return frame.

## Basis

PCjs is the behavioral authority for M2. Its x86 far-call handling establishes equivalent
far-transfer semantics for immediate and memory encodings at the selected operand width. The
local implementation reuses project-owned ModR/M decoding, segment reads, descriptor resolution,
and protected stack helpers rather than copying PCjs source code.

## Scope And Risk

The implementation requires the existing protected-mode, same-privilege, 32-bit-stack path.
Target descriptor validation occurs before the return frame is pushed. Real-mode, virtual-8086,
cross-privilege, call-gate, and address-size-overridden memory forms remain deferred.

## Verification

The focused execution test verifies the six-byte far pointer load, the descriptor-backed target
code segment, the full 32-bit target offset, and both dwords of the return frame. Normal
repository gates run before this part is committed.
