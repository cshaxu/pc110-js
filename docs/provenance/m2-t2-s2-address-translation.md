# M2 T2 S2 Address Translation Provenance

## Identity

- Subsystem: generic 80386 mode selection, segmentation, and page walking.
- Migration milestone, task, and subtask: M2 T2 S2 P1.
- Source repository and commit: PCjs at
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Source license: MIT.

## Paths

- Source paths: `machines/pcx86/modules/v2/cpux86.js` and `segx86.js`.
- Destination paths: `src/memory/address-translation.ts` and focused tests.
- Runtime dependency closure: none.
- Excluded content: PCjs runtime JavaScript, browser code, ROMs, media, and
  archival content.

## Migration

- Imported behavior: 80386 mode selection, PDE/PTE address derivation,
  descriptor field decoding, segment access predicates, and GDT-resident LDT
  descriptor validation, including protected-mode stack-segment privilege
  checks, plus GDTR/IDTR state and 32-bit CR0 state writes.
  Normalized EFLAGS state writes support virtual-8086 mode selection, with
  multi-byte segment-range validation.
- Mechanical adaptation: explicit pure functions and a memory-reader interface.
- Intentional behavior changes: M2 T2 S4 P6 corrected real and virtual-8086
  translation to use the architectural cached segment base. This preserves the
  80386 reset CS hidden base and produces the high reset vector `0xfffffff0`;
  ordinary real-mode segment loads retain the same selector-derived base.
- Incomplete behavior: descriptor-table loading, gates, tasks, and CPU exception
  delivery remain in later bounded CPU work.
