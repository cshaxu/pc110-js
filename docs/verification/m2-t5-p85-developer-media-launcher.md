# M2 T5 P85 Verification

- `node --check scripts/serve.mjs` passed.
- A launcher-served local endpoint returned the expected byte lengths: system
  ROM `32768`, VGA ROM `24576`, and floppy `1474560`.
- Manual browser validation at `?dev-media=1` loaded the fixed development
  media and reported native FDC attachment as `D0 1:0`; it did not claim a DOS
  boot or resolve the current BIOS keyboard boundary.
- `pnpm run format`, `pnpm run build`, `pnpm run lint`, `pnpm run test`, and
  `git diff --check` passed in pc110-js: 126 test files and 916 tests.
