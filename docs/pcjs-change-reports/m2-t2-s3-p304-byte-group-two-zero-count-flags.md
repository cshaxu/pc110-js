# M2 T2 S3 P304: Byte Group 2 Zero Count And Flags

## Summary

Correct zero-count and undefined-overflow behavior in the contextual byte
Group 2 implementation.

## Basis

Intel IA-32 defines a masked zero shift or rotate count as leaving the operand
and flags unchanged. It defines OF for SHL, SHR, and SAR only when the count is
one. NXVM's Group 2 instruction coverage is the CPU behavior reference; PCjs
remains the PC/AT and whole-machine comparison source.

## Change

The project-owned contextual byte helper now advances past a zero-count
instruction without reading or writing its operand or flags. Byte SHL, SHR,
and SAR flag writers preserve OF for a multi-bit count while retaining their
defined CF, SF, ZF, and PF updates.

## Verification

Focused state tests cover each multi-bit byte shift family with OF set.
Contextual execution coverage verifies that C0 with a zero count preserves
registers and EFLAGS while advancing EIP by the complete instruction length.
The full project gate passes.

## Boundary

This part does not expand instruction coverage, alter word/dword Group 2
semantics, add paging or device behavior, or begin M2 T3.
