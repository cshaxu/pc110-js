# M2 T5 P138 Verification: PCjs 8042 Restore Transition

- The PCjs `pc110` branch rebuilds the uncompiled `2.25` diagnostic bundle.
- `node --check` passes for the rebuilt bundle.
- `git diff --check` passes in the PCjs worktree.
- The next bounded browser observation must expose the restored `0x10` to
  `0x45` command-byte transition before any native correction is proposed.
