# M2 T2 S3 P446 PCjs Change Report: Protected Segment-Range Preflight

## Summary

- Affected PCjs-derived subsystem: rebuilt segmented memory access.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: a protected multi-byte access crossing a segment limit now
  faults before any byte translation or memory access.

## Justification

- Configuration or a device adapter cannot validate a generic CPU operand range.
- NXVM `_kma_linear_logical` validates the complete byte range before access.
- The change is confined to protected mode; real and virtual-8086 behavior is
  unchanged.

## Verification

- Focused tests reject word and dword accesses crossing a 16-bit protected
  segment limit.
- The full project gate remains required before commit.
