# M2 T2 S3 Execution Provenance

## Identity

- Subsystem: generic 80386 instruction fetch and execution boundary.
- Migration milestone, task, and subtask: M2 T2 S3 P2.
- Source repository and commit: PCjs at
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Source license: MIT.

## Paths

- Source paths: `machines/pcx86/modules/v2/cpux86.js` and `x86ops.js`.
- Destination paths: `src/cpu/x86/execution.ts` and focused tests.
- Runtime dependency closure: none.
- Excluded content: PCjs runtime JavaScript, prefetch optimization, ROMs,
  media, browser code, and archival content.

## Migration

- Imported behavior: opcode fetch begins at the current linear instruction
  address derived from CS:EIP.
- Mechanical adaptation: a narrow byte-reader interface replaces PCjs bus and
  cache objects.
- Intentional behavior changes: none.
- Incomplete behavior: paging hookup, prefetch, decode, execution, exceptions,
  and interrupts remain later S3 work.
