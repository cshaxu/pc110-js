# M2 T2 S1 CPU State Provenance

## Identity

- Subsystem: 80386 architectural state and reset.
- Record date: 2026-07-28.
- Migration milestone, task, and subtask: M2 T2 S1.
- Source repository: PCjs.
- Source remote: `https://github.com/jeffpar/pcjs`.
- Source commit: `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Source license: MIT.

## Paths

- Source paths: `machines/pcx86/modules/v2/cpux86.js` and
  `machines/pcx86/modules/v2/x86.js`.
- Destination paths: `src/cpu/x86/state.ts` and its focused test.
- Runtime dependency closure: none; M2 runtime does not import PCjs.
- Excluded neighboring content: PCjs browser runtime, ROMs, disks, archives,
  and XSL resources.

## Migration

- Imported behavior: generic 80386 reset registers, control registers, IDT,
  and real-mode segment reset values.
- Mechanical adaptations: project-native immutable snapshots and TypeScript
  records replace PCjs mutable component fields.
- TypeScript implementation status: initial reset-state implementation.
- Runtime JavaScript exception: none.
- Intentional behavior changes: none.
- Related PCjs change reports: none.

## License And Notices

- Preserved copyright notices: PCjs attribution remains in
  `THIRD_PARTY_NOTICES.md`.
- Preserved license text: `third_party/licenses/PCjs-LICENSE.txt`.
- Third-party notice update: existing PCjs notice covers this derived subsystem.
- Asset exclusion review: pass; no protected assets added.

## Verification

- Focused tests: `src/cpu/x86/state.test.ts`.
- M1 PCjs reference comparison: reset values studied at the pinned source.
- M2 TypeScript golden boot regression: not established.
- Manual browser verification: not applicable to state-only subtask.
- Known differences: instruction and segment behavior remain outside this
  subtask.
