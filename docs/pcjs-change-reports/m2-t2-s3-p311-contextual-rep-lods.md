# M2 T2 S3 P311: Contextual REP LODS

## Summary

Add REP and REPNE LODS execution through the shared execution-size context.

## Basis

Intel IA-32 uses address size for the string count and source index, and
operand size for LODSW/LODSD data width. NXVM covers LODS string behavior.
PCjs remains the PC/AT comparison source.

## Change

The project-owned contextual decoder now repeats LODSB, LODSW, and LODSD for
either repeat prefix, updating accumulator, SI/ESI, and CX/ECX without
changing flags.

## Verification

Focused coverage verifies REP LODSD in a default-32 code segment, including
last-value, count, index, and instruction-length behavior. The full project
gate passes.

## Boundary

This part does not change other string families, hardware, or M2 T3 work.
