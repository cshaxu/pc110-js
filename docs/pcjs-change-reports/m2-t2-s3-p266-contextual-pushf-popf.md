# M2 T2 S3 P266: Contextual PUSHF And POPF

## Summary

Route PUSHF/POPF through the project-native execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 operand-size selects flags
data width while the stack segment D/B attribute selects stack addressing.

## Change

PUSHF/POPF now use context-selected word or dword data and independent SS
stack addressing. Existing protected-mode CPL fault ordering and VM/RF masking
remain explicit.

## Verification

Focused tests cover `66` dword flags in a 16-bit-default code segment and
default-32 flags with a 16-bit SS stack pointer, including wraparound, data
width, EIP, and architectural EFLAGS fixed bits. The full project gate passes.

## Boundary

This slice excludes VM86, IOPL-specific POPF behavior beyond existing paths,
devices, firmware, PC110, and M2 T3 work.
