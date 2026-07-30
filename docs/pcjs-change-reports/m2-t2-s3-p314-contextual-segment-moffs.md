# M2 T2 S3 P314: Contextual Segment Moffs

## Summary

Support segment overrides for contextual A0-A3 moffs instructions.

## Basis

Intel IA-32 allows segment overrides on direct-offset accumulator moves while
66 and 67 independently select data and offset widths. PCjs remains the PC/AT
comparison source; NXVM provides the CPU coverage target.

## Change

The project-owned moffs helper now selects the override segment when present.
The generic contextual dispatcher admits only this safe family under a segment
override; all other families preserve their existing fallback boundary.

## Verification

Focused coverage verifies a default-32 FS-overridden A1 with moffs32 and
prefix-inclusive EIP length. Existing CS moffs coverage remains green. The
full project gate passes.

## Boundary

This part does not migrate general ModR/M segment overrides, LOCK behavior,
hardware, or M2 T3 work.
