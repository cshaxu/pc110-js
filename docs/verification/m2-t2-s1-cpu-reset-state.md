# M2 T2 S1 Verification: 80386 Reset State

## Result

Pass.

## Evidence

- The project-native CPU state resets general registers, 80386 `EDX`, control
  registers, IDT, and real-mode segments to the values studied from pinned
  PCjs PCx86 v2.
- The reset CS base and EIP produce the 80386 high-memory reset vector
  `0xfffffff0` once physical address formation is implemented.
- Focused tests verify reset values and that returned snapshots do not mutate
  internal register state.
- `pnpm run build`, `pnpm run lint`, `pnpm run format`, and `pnpm run test`
  passed.

## Boundary

No instruction, segmentation-load, paging, exception, interrupt, or 80486
behavior is claimed by this subtask.
