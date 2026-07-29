# M2 T2 S5 Instruction Trace Provenance

## Identity

- Subsystem: project-owned instruction trace hook.
- Migration milestone, task, and subtask: M2 T2 S5 P2.
- Source repository and commit: PCjs at
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Source license: MIT.

## Paths

- Source paths: `machines/pcx86/modules/v2/cpux86.js` and debugger-adjacent
  tracing facilities.
- Destination paths: `src/cpu/x86/execution.ts` and focused tests.
- Runtime dependency closure: none.
- Excluded content: PCjs runtime JavaScript, debugger UI, browser code, and
  device behavior.

## Migration

- Imported behavior: observability is outside instruction semantics and can
  receive the instruction fetch record with CPU state transitions.
- Mechanical adaptation: a TypeScript wrapper snapshots the project-owned CPU
  state before and after `stepInstruction` and emits a typed event.
- NXVM scope: its trace-oriented CPU organization informed this observability
  boundary only; no NXVM execution, BIOS, POST, device, or platform behavior
  was used.
- Intentional behavior changes: none.
- Incomplete behavior: trace storage, filtering, device events, and browser
  presentation remain later S5 and T5 work.

## Verification

- Focused test: a NOP trace contains the fetched opcode and the committed EIP
  transition.
- M1 reference comparison: trace observability is compared structurally only;
  PCjs remains the execution behavior authority.
