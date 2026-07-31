# M2 T5 P92 Provenance

- Owner required PC110JS to use npm only, rather than retaining pnpm as a
  project dependency or documented workflow.
- The existing Git Bash toolchain provides Node `22.22.1` and npm `10.9.4`.
- npm could not generate a lockfile over pnpm's linked dependency tree, so the
  generated `node_modules` directory was replaced with a clean npm install
  before validation.
