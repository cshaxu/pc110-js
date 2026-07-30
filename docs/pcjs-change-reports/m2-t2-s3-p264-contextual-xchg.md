# M2 T2 S3 P264: Contextual ModR/M XCHG

## Summary

Route `86` and `87` ModR/M exchange instructions through the project-native
execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 operand-size and address-size
prefix semantics select the `87` data width and ModR/M effective address.

## Change

The existing exchange helper accepts context-selected byte, word, or dword data
width and 16-bit or 32-bit addressing. It retains no-flags-change behavior.

## Verification

Focused default-32 tests cover dword `87`, `66` word, `67` memory addressing,
register-width preservation, memory width, instruction length, and flags. The
complete project gate passes.

## Boundary

This slice excludes short-encoded XCHG migration, LOCK semantics, devices,
firmware, PC110, and M2 T3 work.
