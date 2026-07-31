# M2 T5 P54 Provenance

- Authority: P48 confirms the selected ROM reaches the native `0x64`/`0x60`
  exchange before the keyboard-buffer wait. PCjs `chipset.js` documents the
  compatible BIOS pattern: controller command `0x60`, command byte `0x4D`,
  then a wait for keyboard BAT `0xAA` after both lines are released.
- Contract: the project-native keyboard owns only its power-on BAT state. The
  existing 8042 owns line decoding, output buffering, and IRQ1 composition.
- Boundary: no BDA write, BIOS/DOS service, timer shortcut, copied PCjs code,
  or keyboard command-protocol emulation is introduced.
