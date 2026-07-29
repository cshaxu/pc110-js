# M2 T2 S3 P224: Protected-Mode 32-Bit Memory Far JMP

## Summary

This change adds the protected-mode 32-bit memory form of `JMP FAR m16:32` (`66 FF /5`) with
the existing 16-bit ModR/M addressing path. It reads the six-byte far pointer from memory and
loads its target through the project-owned protected code-segment resolver.

## Basis

PCjs is the behavioral authority for M2. Its x86 far-jump behavior establishes that immediate
and memory far pointers share normal protected-mode target code-segment validation. The local
implementation reuses existing ModR/M, segmented-memory, descriptor, and segment-state helpers
instead of copying PCjs source code.

## Scope And Risk

The implementation is limited to protected mode and the existing 16-bit addressing form. It
does not change real-mode far jumps. Virtual-8086 mode, call gates, and address-size-overridden
memory forms remain deferred.

## Verification

The focused execution test verifies pointer loading, the full 32-bit instruction pointer, and
the descriptor-backed target code segment. Normal repository gates run before this part is
committed.
