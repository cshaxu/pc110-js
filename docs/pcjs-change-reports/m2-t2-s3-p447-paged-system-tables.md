# M2 T2 S3 P447 PCjs Change Report: Paged System-Table Access

## Summary

- Affected PCjs-derived subsystem: rebuilt protected system-table access.
- Source provenance record: `docs/provenance/m2-t2-s3-execution.md`.
- Changed behavior: GDT/LDT/IDT/TSS accesses now use supervisor linear paging
  instead of bypassing translation as physical memory accesses.

## Justification

- System-table bases are linear addresses under 80386 paging and cannot be
  corrected by a machine configuration or device adapter.
- NXVM routes system-table reads and writes through logical/linear access with
  supervisor privilege.
- Page-table walks remain physical; no firmware, device, or guest behavior is
  introduced.

## Verification

- Focused tests load and update a mapped GDT descriptor and distinguish
  supervisor system access from a CPL3 data access to a supervisor-only page.
- The full project gate remains required before commit.
