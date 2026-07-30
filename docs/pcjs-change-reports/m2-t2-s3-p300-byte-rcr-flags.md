# M2 T2 S3 P300: Byte RCR Flags

## Summary

Correct the byte RCR flag path to use rotate-right overflow semantics.

## Basis

NXVM `_a_rcr` defines overflow for a one-bit RCR from the resulting high two
bits and leaves it undefined for larger counts. Intel IA-32 specifies the same
one-bit boundary. PCjs remains the PC/AT and whole-machine comparison reference.

## Change

The existing D0 byte RCR path uses a dedicated rotate-right flag writer instead
of the rotate-left formula.

## Verification

Focused state tests verify CF and one-bit OF plus preservation of OF when the
count does not define it. The full project gate passes.

## Boundary

This part does not complete the remaining C0 or D2 byte Group 2 forms.
