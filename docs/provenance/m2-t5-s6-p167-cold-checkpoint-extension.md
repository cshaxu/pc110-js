# M2 T5 S6 P167 Cold Checkpoint Extension Provenance

## Inputs

The existing selected DeskPro diagnostic retained its deterministic RTC seed,
verified local floppy, cold `ramLow test="true"` configuration, and opt-in
PCjs batch control.

## Method

After replaying the P164 reset-search prefix, the same paused native and PCjs
endpoints advanced 128 ordinary 1,024-instruction batches. No source,
configuration, PCjs branch, or emulation behavior changed.

## Boundary

The result extends cold differential evidence to 393,216 instructions. It
establishes no new compatibility exception and does not introduce state
transfer, a firmware shortcut, or a guest-service behavior.
