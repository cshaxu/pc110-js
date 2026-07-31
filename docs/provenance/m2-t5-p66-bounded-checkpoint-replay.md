# M2 T5 P66 Provenance

- Authority: the owner-directed trace policy requires one Fast boundary run and
  a short, deterministic Full Debug replay only after an unexpected boundary.
- Contract: an explicit `CS:EIP` target is checked without per-instruction
  snapshots. On one match, the project-native core and replay identity are
  captured in memory, then restored into an identically configured native core.
- Bound: replay is opt-in, limited to 10,000 instructions, and retains at most
  32 machine events per replayed instruction plus the final stop event. It is
  not a browser feature, a long-run trace mode, or a device workaround.
