# M2 T5 P95 Provenance

- P93 and P94 supply separate native and PCjs CPU diagnostic snapshots, but a
  browser page must not decide equivalence through presentation text or an
  ad-hoc JSON comparison.
- This part adds a project-owned comparator for the architectural fields whose
  representation has been established on both sides. It reports the first
  deterministic difference and has no CPU, device, or PCjs runtime ownership.
