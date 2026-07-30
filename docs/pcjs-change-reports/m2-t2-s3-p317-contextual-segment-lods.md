# M2 T2 S3 P317: Contextual Segment LODS

## Summary

Support source-segment overrides for contextual non-repeated LODS.

## Basis

Intel IA-32 permits source segment overrides on LODS. Address size selects
SI/ESI and operand size selects LODSW/LODSD data width. NXVM covers LODS;
PCjs remains the PC/AT comparison source.

## Change

The project-owned decoder now executes non-repeated segment-overridden LODS
through a contextual helper. It deliberately declines REP/REPNE forms so the
existing repeat helper retains their count-loop semantics.

## Verification

Focused coverage verifies FS LODSD in a default-32 code segment and confirms
the existing FS REP LODSB regression remains green. The full project gate
passes.

## Boundary

This part does not migrate non-repeated MOVS source overrides, general ModR/M
segment overrides, LOCK behavior, hardware, or M2 T3 work.
