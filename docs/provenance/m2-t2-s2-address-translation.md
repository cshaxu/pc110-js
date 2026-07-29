# M2 T2 S2 Address Translation Provenance

## Identity

- Subsystem: generic 80386 mode selection, segmentation, and page walking.
- Migration milestone, task, and subtask: M2 T2 S2 P1.
- Source repository and commit: PCjs at
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Source license: MIT.

## Paths

- Source paths: `machines/pcx86/modules/v2/cpux86.js` and `segx86.js`.
- Destination paths: `src/cpu/x86/address-translation.ts` and focused tests.
- Runtime dependency closure: none.
- Excluded content: PCjs runtime JavaScript, browser code, ROMs, media, and
  archival content.

## Migration

- Imported behavior: 80386 mode selection, PDE/PTE address derivation,
  descriptor field decoding, and segment access predicates.
- Mechanical adaptation: explicit pure functions and a memory-reader interface.
- Intentional behavior changes: none.
- Incomplete behavior: LDT, gate, task, and CPU exception delivery remain in
  later bounded CPU work.
