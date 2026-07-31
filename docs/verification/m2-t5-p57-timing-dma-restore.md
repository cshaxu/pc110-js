# M2 T5 P57 Verification

- Focused tests cover capture, mutation, restore, exact state equality, and
  equal continuation for PIT, DMA, RTC/CMOS, RTC address/NMI state, and port
  `0x61` counter-2 gating.
- The full repository gate, including format, build, lint, test, and
  `git diff --check`, must pass before commit.
