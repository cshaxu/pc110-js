# M2 T2 S3 P260: 80386 Coverage Matrix

## Summary

Add an M2 T2 CPU coverage ledger that makes T2 completion measurable before T3
is requested.

## Basis

PCjs is the behavioral authority and Intel 80386 architecture is the semantic
requirement. NXVM `vcpu.h` and `vcpuins.c` were inspected only to organize CPU
state, descriptor, paging, decoder, and system-path coverage categories.

## Change

The matrix records implemented, partial, and pending CPU areas, then names the
ROM trace, PCjs comparison, and focused-test evidence needed to close T2. It
does not add emulator behavior.

## Verification

The repository quality gate validates this documentation-only change. The matrix
will be updated in each completed CPU slice.

## Boundary

This record does not authorize T3, source translation, NXVM behavior adoption,
hardware work, firmware shortcuts, or PC110 work.
