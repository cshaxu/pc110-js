# M2 T2 S5 Machine Core Provenance

## Identity

- Subsystem: project-owned PC/AT 386 CPU, memory, I/O, and stepping composition.
- Migration milestone, task, and subtask: M2 T2 S5 P4.
- Source repository and commit: PCjs at
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Source license: MIT.

## Paths

- Source paths: PCjs PCx86 machine composition and CPU/bus integration paths.
- Destination paths: `src/machine/pc-at-386-core.ts` and focused tests.
- Runtime dependency closure: project-owned CPU state, physical memory, port
  contract, deterministic stepper, and trace contract only.
- Excluded content: PCjs runtime JavaScript, machine configuration files,
  browser code, ROMs, and device implementations.

## Migration

- Imported behavior: the CPU executes against the selected machine's physical
  memory and I/O boundaries rather than a test-only callback surface.
- Mechanical adaptation: a small TypeScript composition root owns the generic
  CPU and delegates stepping to the existing deterministic coordinator.
- Intentional behavior changes: machine-wide reset is not claimed; `resetCpu`
  deliberately resets CPU state only until device reset ordering is modeled.
- Incomplete behavior: device registry composition, system reset routing,
  scheduling, and all concrete PC/AT devices remain later M2 work.

## Verification

- Focused test: a synthetic immutable BIOS ROM mapped at low and high aliases
  runs NOP then HLT from the 80386 reset vector through the complete current
  project-owned core boundary.
- M1 reference comparison: reset-vector alias placement follows the pinned
  PCjs 386 reference model; full firmware boot remains pending.
