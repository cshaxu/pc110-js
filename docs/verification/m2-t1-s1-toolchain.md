# M2 T1 S1 Verification: Pinned Toolchain

## Result

Pass.

## Pinned Components

- Node.js `>=22.0.0`, pnpm `11.9.0`
- TypeScript `5.7.2`
- Vite `6.0.5`, Vitest `2.1.8`
- ESLint `9.17.0`, typescript-eslint `8.18.1`
- Prettier `3.4.2`

## Commands

All completed successfully from the project root:

```text
pnpm run build
pnpm run lint
pnpm run format
pnpm run test
```

The test command explicitly permits the empty suite only during this foundation
subtask. pnpm 11 build approval is limited to `esbuild` in
`pnpm-workspace.yaml`; all other dependency scripts remain disallowed.
