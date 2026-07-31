# M2 T5 P89 Verification

- Focused tests assert that a consumed controller self-test byte clears OBF
  but a later data-port read returns the retained `0x55` latch.
- A bounded browser checkpoint with verified local media reached `F000:C65E`
  and retained `R0060:55 W0064:AD R0064:18 R0060:55` in the native 8042 tail.
- The same-page PCjs probe remained enabled and recorded real firmware
  transactions during the checkpoint.
- `pnpm run format`, `pnpm run build`, `pnpm run lint`, `pnpm run test`, and
  `git diff --check` passed: 126 test files and 917 tests.
