# M2 T5 P96 Provenance

- P95 supplies a project-owned first-difference comparator but does not itself
  sample browser machines.
- The development-only same-origin page already hosts the native machine and
  opt-in PCjs reference iframe. This part binds their existing diagnostic
  controls without importing PCjs into the product runtime.
- The bridge refuses to step while native execution is running, while PCjs is
  not paused, or when established CPU entry state differs. It does not reset,
  inject, or otherwise mutate either machine to manufacture equivalence.
