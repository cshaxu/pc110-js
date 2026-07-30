# M2 T2 S3 P448 PCjs Change Report: Selector Query Page Faults

## Summary

- Affected PCjs-derived subsystem: rebuilt LAR, LSL, VERR, and VERW descriptor
  query execution.
- Changed behavior: descriptor-table page faults are delivered rather than
  being converted into a ZF-clear invalid-selector result.

## Justification

- Invalid selectors and inaccessible paged system memory are distinct CPU
  outcomes and cannot be corrected by configuration or adapters.
- The change follows the NXVM separation between selector validation and
  logical-memory access.

## Verification

- Focused VERR evidence reaches `#PF` for an unmapped active-LDT descriptor
  while retaining mapped GDT and IDT delivery structures.
- The full project gate remains required before commit.
