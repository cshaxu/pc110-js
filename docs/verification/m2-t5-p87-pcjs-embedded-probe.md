# M2 T5 P87 Verification

- The same-origin HTML page initialized PCjs through `embedPCx86()` and loaded
  the selected ROMs and read-only local floppy in the in-app browser.
- Its visible component registry included `deskpro386.chipset`, reported
  `enabled:true`, and exported a bounded 8042 tail after firmware activity.
- The initial observed tail includes status reads, the `0xAA` controller
  command, and the `0x55` controller data read; it is reference observation,
  not a native compatibility claim.
- The same-origin paired page displayed both native controls and the live PCjs
  frame. The full project gate is required before commit.
- `pnpm run format`, `pnpm run build`, `pnpm run lint`, `pnpm run test`, and
  `git diff --check` passed: 126 test files and 916 tests.
