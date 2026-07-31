# M2 T5 P42 Verification

- Focused: `pnpm exec vitest run src/app/native-core-checkpoint.test.ts`.
- Full gate: format, build, lint, tests, and `git diff --check` passed.
- Scope: browser status now reports native FDC phase, MSR, IRQ, pending DMA
  bytes, and drive-zero state for bounded checkpoint diagnosis.
