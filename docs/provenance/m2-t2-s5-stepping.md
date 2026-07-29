# M2 T2 S5 Deterministic Stepping Provenance

## Identity

- Subsystem: project-owned deterministic CPU stepping boundary.
- Migration milestone, task, and subtask: M2 T2 S5 P3.
- Source repository and commit: PCjs at
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Source license: MIT.

## Paths

- Source paths: `machines/pcx86/modules/v2/cpux86.js` and scheduling-adjacent
  machine code.
- Destination paths: `src/machine/cpu-stepper.ts` and focused tests.
- Runtime dependency closure: project-owned CPU, instruction-memory, port-I/O,
  and trace contracts only.
- Excluded content: PCjs runtime JavaScript, host timers, browser code, and
  device implementations.

## Migration

- Imported behavior: CPU execution is driven through explicit bounded steps,
  separate from host scheduling.
- Mechanical adaptation: a typed TypeScript coordinator composes the existing
  CPU step, port boundary, and trace hook without owning device reset.
- Intentional behavior changes: none.
- Incomplete behavior: machine-wide reset ordering, cycle accounting, device
  scheduling, and browser pacing remain later S5 and T3 work.

## Verification

- Focused tests: bounded NOP/HLT execution, halt detection, trace forwarding,
  and invalid-budget rejection.
- M1 reference comparison: the explicit stepping boundary is compared
  structurally; complete timing behavior remains pending.
