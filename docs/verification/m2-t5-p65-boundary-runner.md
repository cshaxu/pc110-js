# M2 T5 P65 Verification

- A focused test reaches a post-NOP instruction boundary, reports one executed
  instruction and `reached: true`, and leaves the next instruction unexecuted.
- The full repository gate, including format, build, lint, test, and
  `git diff --check`, must pass before commit.
