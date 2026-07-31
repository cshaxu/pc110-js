# M2 T5 P136 Provenance: Early F1 Input

The selected DeskPro BIOS reaches a BDA keyboard-buffer wait with 8042 command
byte `0x5D`. PCjs retains host keyboard data while the controller clock is
inhibited, so a reproducible native comparison needs an early, ordinary host
input path rather than a guest-memory shortcut.

The development-only page now offers `Send F1` beside the existing `Send A`
control. It enqueues ordinary Set-1 make and break bytes through the existing
browser queue. It is absent from normal and production pages and does not
modify firmware, guest memory, device state, or timing.
