# M2 T2 S3 P316: Contextual Segment REP MOVS

## Summary

Support source-segment overrides for contextual repeated MOVS.

## Basis

Intel IA-32 permits source segment overrides on MOVS while retaining ES as the
fixed destination segment. Address size selects count and source/destination
index widths. NXVM covers repeated MOVS behavior; PCjs remains the PC/AT
comparison source.

## Change

The project-owned repeat-transfer helper now selects an override source segment
for MOVS reads and retains ES writes. The contextual segment-override boundary
admits repeated transfer forms only after their helper recognizes the opcode.

## Verification

Focused coverage verifies FS REP MOVSB with default-32 ESI, EDI, and ECX
semantics. Existing CS REP MOVSW coverage remains green. The full project gate
passes.

## Boundary

This part does not migrate non-repeated MOVS source overrides, general ModR/M
segment overrides, LOCK behavior, hardware, or M2 T3 work.
