# M2 T5 P58 Verification

- Focused tests prove capture, mutation, restore, exact equality, and equal
  FDC DMA continuation. They also prove writable raw-sector media restoration
  and the adapter's restored DMA-request signal.
- The full repository gate, including format, build, lint, test, and
  `git diff --check`, must pass before commit.
