# M2 T2 S3 P449 PCjs Change Report: System Selector Page Faults

## Summary

- Affected PCjs-derived subsystem: rebuilt LLDT and LTR selector loading.
- Changed behavior: a paged GDT read now propagates `#PF` instead of being
  converted to `#GP(selector)`.

## Justification

- Descriptor lookup classification and a genuine system-memory page fault are
  different CPU outcomes.
- This follows the NXVM separation between `_s_load_ldtr`/`_s_load_tr` and its
  logical descriptor-table memory access.

## Verification

- Focused direct system-group evidence executes LLDT with an unmapped GDT page
  and verifies `#PF` plus the descriptor linear address in CR2.
- The full project gate remains required before commit.
