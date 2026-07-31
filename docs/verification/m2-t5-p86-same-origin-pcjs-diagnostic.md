# M2 T5 P86 Verification

- `node scripts/serve.mjs --pcjs-reference --port 5204` served the temporary
  machine XML with `pc110Probe="true"` and the `2.25` bundle containing
  `pc110ProbeEvents` from the same Vite origin.
- The browser page at `?dev-media=1&pcjs-reference=1` displayed the native
  machine and the opt-in PCjs reference iframe together.
- The in-app browser rendered the XML/XSL iframe blank and exposed no PCjs
  Run control, while the route and bundle HTTP checks remained successful.
  This is recorded as a browser-surface limitation, not an emulator result.
- `pnpm run format`, `pnpm run build`, `pnpm run lint`, `pnpm run test`, and
  `git diff --check` passed: 126 test files and 916 tests.
