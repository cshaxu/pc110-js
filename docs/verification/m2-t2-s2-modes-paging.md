# M2 T2 S2 Verification: 80386 Modes And Paging

## Scope

Verified the project-native 80386 mode-selection, segmentation, descriptor-table,
and paging contracts. This includes real, protected, and virtual-8086 mode
selection; GDT/LDT descriptor lookup; access and multi-byte range validation;
two-level page walking; accessed/dirty state; page-fault metadata; CR2 capture;
and CR3-flushed translation caching.

## Automated Checks

- `pnpm run format`
- `pnpm run build`
- `pnpm run lint`
- `pnpm run test`
- `git diff --check`

All checks passed on the completion commit. The test suite reported 10 files and
25 tests passing.

## Deferred Behavior

Instruction decoding and execution, privileged control-register and
descriptor-table instructions, exception delivery, gates, and task switching are
owned by M2 T2 S3. Browser verification is not applicable before the M2 whole
machine is assembled; no standalone boot baseline is claimed.
