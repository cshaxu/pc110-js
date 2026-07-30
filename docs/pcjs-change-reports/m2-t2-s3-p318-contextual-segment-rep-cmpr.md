# M2 T2 S3 P318: Contextual Segment REP CMPS

## Summary

Support source-segment overrides for contextual repeated CMPS.

## Basis

Intel IA-32 permits source segment overrides on CMPS while retaining ES as the
fixed destination segment. REP/REPNE stop according to the resulting ZF. NXVM
covers repeated CMPS; PCjs remains the PC/AT comparison source.

## Change

The project-owned repeat-comparison helper now selects an override source
segment for CMPS reads and retains the existing count, index, flag, and stop
condition logic.

## Verification

Focused coverage verifies FS REP CMPSB with a second-byte mismatch, including
ECX/ESI/EDI, ZF, and prefix-inclusive EIP behavior. The full project gate
passes.

## Boundary

This part does not migrate non-repeated CMPS source overrides, general ModR/M
segment overrides, LOCK behavior, hardware, or M2 T3 work.
