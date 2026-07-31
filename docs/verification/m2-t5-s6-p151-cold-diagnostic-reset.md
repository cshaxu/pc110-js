# M2 T5 S6 P151 Cold Diagnostic Reset Verification

## Focused Checks

- Diagnostic XML requires the selected low-RAM component to retain
  `test="true"`.
- Diagnostic XML rejects the source profile's `test="false"` warm-boot
  configuration for that component.

## Boundary

This removes a known PCjs boot-speed shortcut from differential diagnostics.
It does not change the M1 reference run or add a native BIOS workaround.
