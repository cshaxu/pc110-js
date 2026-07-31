# M2 T5 P83 Provenance

- The owner authorized PCjs changes only on its local `pc110` branch for
  diagnostic value; P82 supplied an opt-in 8042 transaction tail there.
- The normal reference server reads every PCjs resource through a pinned git
  object, so it cannot accidentally serve unpinned worktree content.
- P83 retains that default and permits worktree resources only under the
  explicit diagnostic environment variable, after branch and source-marker
  checks.
- Local HTTP validation proved the diagnostic XML includes `pc110Probe="true"`
  and its ChipSet source includes `pc110ProbeEvents`; normal mode includes
  neither marker.
