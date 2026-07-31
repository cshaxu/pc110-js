# M2 T5 P66 Verification

- The pinned-ROM smoke command reaches reset `F000:FFF0` without executing an
  instruction, restores its atomic checkpoint into a second native core, and
  replays one instruction twice with equal final machine state.
- The Full Debug record retains the reset-vector far-jump opcode `EA`; the
  final stop event no longer displaces instruction evidence.
- Format, build, lint, test, and `git diff --check` must pass before commit.
