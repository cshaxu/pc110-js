# M2 T2 S3 P258: T2 Priority Clarification

## Summary

Record the owner direction that M2 T2 must complete before any M2 T3 work is
requested.

## Basis

PCjs remains the project behavioral and compatibility authority. Intel 80386
architecture remains the semantic requirement. NXVM `vcpu.h` and `vcpuins.c`
may inform M2 CPU structure and coverage review only; their C implementation,
BIOS, POST, I/O, and guest-service behavior are excluded.

## Change

No emulator behavior changes. The active plan now explicitly requires
execution-size migration, remaining 80386 instruction and system paths, focused
tests, a selected local ROM trace, a coverage matrix, and bounded PCjs
comparison records before T3 authorization is requested.

## Verification

The repository quality gate validates this documentation-only change. Runtime
behavior remains covered by the existing M2 T2 S3 regression suite.

## Boundary

This record does not authorize M2 T3, PC110 work, device work, BIOS/DOS
shortcuts, or source translation from PCjs or NXVM.
