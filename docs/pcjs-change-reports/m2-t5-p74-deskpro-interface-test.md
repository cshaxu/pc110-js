# M2 T5 P74 PCjs Change Report: DeskPro 8042 Interface Test

## Basis

PCjs remains the generic PC/AT behavior authority and returns `0x00` for the
8042 interface test. The selected DeskPro ROM is direct evidence for its own
machine-specific contract: it checks the test result against `0x05`.

## Project Change

The project-native controller now accepts a configurable interface-test result.
Generic construction retains `0x00`; only selected DeskPro composition passes
`0x05`.

## Boundary

No PCjs source is copied or used at runtime. The option changes only the
controller response byte and introduces no guest service, input injection,
firmware branch, or timer shortcut.
