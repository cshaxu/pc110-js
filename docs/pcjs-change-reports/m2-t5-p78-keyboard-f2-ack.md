# M2 T5 P78 PCjs Change Report: Keyboard F2 Acknowledge

## Basis

PCjs documents keyboard command `0xF2` as a reserved NOP that acknowledges
without changing scan behavior. The selected DeskPro ROM uses that contract.

## Project Change

The project-native AT keyboard now returns `0xFA` for `0xF2`. The existing
8042 adapter serializes it through the output buffer and IRQ1 path.

## Boundary

No PCjs code is copied or used at runtime. No keyboard identity payload,
guest-service behavior, firmware state, or input shortcut is added.
