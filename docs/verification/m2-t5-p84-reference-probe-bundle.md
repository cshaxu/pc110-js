# M2 T5 P84 Verification

- `node --check machines/pcx86/releases/2.25/pcx86-uncompiled.js` passed in
  the PCjs `pc110` branch.
- PCjs `git diff --check` passed before the generated-bundle commit.
- `pnpm run format`, `pnpm run build`, `pnpm run lint`, `pnpm run test`, and
  `git diff --check` passed in pc110-js: 126 test files and 916 tests.
- Probe-mode HTTP verification returned `200` and confirmed uncompiled mode,
  probe setting, XSL release selection, and bundle instrumentation.
