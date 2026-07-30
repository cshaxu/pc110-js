# M2 T2 S3 P315: Contextual Segment REP LODS

## Summary

Support source-segment overrides for contextual repeated LODS.

## Basis

Intel IA-32 permits source segment overrides on LODS while address size selects
the count and source-index width. NXVM covers repeated LODS behavior. PCjs
remains the PC/AT comparison source.

## Change

The project-owned repeat LODS helper now selects an override source segment.
Only repeated LODS is admitted alongside moffs under the contextual segment
override boundary.

## Verification

Focused coverage verifies FS REP LODSB with default-32 ESI and ECX behavior.
The full project gate passes.

## Boundary

This part does not migrate ordinary LODS segment overrides, general ModR/M
segment overrides, LOCK behavior, hardware, or M2 T3 work.
