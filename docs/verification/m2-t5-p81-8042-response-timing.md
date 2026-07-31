# M2 T5 P81 Verification

- Focused controller tests must prove one-poll delayed visibility for command
  replies, immediate visibility for keyboard bytes, and checkpoint-safe state.
- A single Fast Execution browser run with fixed local media reached the later
  `F000:C242`/`F000:DCA6` BIOS keyboard-buffer wait. Its `0xAA` response
  showed the expected `status 0x08` then `0x09` publication sequence. The
  command byte remained `0x5D` and BDA head/tail remained equal, so P81 alone
  does not resolve the later keyboard enable path.
- The full gate must pass before commit.
