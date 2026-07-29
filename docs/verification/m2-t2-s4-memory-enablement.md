# M2 T2 S4 Memory Enablement Verification

## Scope

The bounded dependency correction provides low RAM, A20 gating, immutable ROM
regions and aliases, firmware-image validation, and the existing reset-ROM
far-jump trace through the project-native physical-memory implementation.

## Evidence

- Synthetic tests validate little-endian page-table-width access, A20 address
  bit gating, ROM immutability, explicit aliases, and invalid mappings.
- The prior S3 P16 CS-overridden `JMP FAR m16:16` trace executes from a ROM
  window mapped at `0xffff8000` and its required aliases; it reaches the same
  `F000:1234` result as before the refactor.
- The reset CS hidden base produces the 80386 high reset-vector address
  `0xfffffff0` and fetches through the high ROM alias.
- No firmware, disk image, PCjs runtime source, NXVM source, or guest-service
  implementation is included in the test or runtime path.

## Commands

- `pnpm run format`
- `pnpm run build`
- `pnpm run lint`
- `pnpm run test`
- `git diff --check`
