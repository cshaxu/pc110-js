# M2 T5 S6 P166 Cold Lockstep Continuation Provenance

## Inputs

The existing selected DeskPro diagnostic used its deterministic RTC seed,
verified local floppy, `ramLow test="true"` cold configuration, and the existing
opt-in PCjs batch control.

## Method

After the P164 search completed its existing 262,144-boundary limit, the same
paused native and PCjs endpoints advanced 64 ordinary 1,024-instruction
batches. No source, PCjs branch, configuration, or emulation behavior changed.

## Boundary

The result extends the cold differential evidence by 65,536 instructions. It
does not transfer state, introduce a compatibility exception, or use a firmware
or guest-service shortcut.
