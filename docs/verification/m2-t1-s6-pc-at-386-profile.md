# M2 T1 S6 Verification: Generic PC-AT-386 Profile

## Result

Pass.

## Evidence

- `pc-at-386` selects one generic CPU, memory, chipset, storage, video, input,
  and serial variant.
- Profile tests passed for identity and one-selection-per-device-kind.
- Browser and headless entries instantiate this profile through
  `MachineRuntime`.
- No DeskPro or PC110 variant appears in the default profile.
