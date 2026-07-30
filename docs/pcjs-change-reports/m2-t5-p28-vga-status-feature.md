# M2 T5 P28 PCjs Change Report: VGA Status And Feature

PCjs is not changed or imported. Its VGA reference maps Input Status 0 at
`0x3C2`, derives SWSENSE from DAC register zero for the IBM VGA ROM, and owns
Feature Control writes at `0x3BA`/`0x3DA` with `0x3CA` readback. This part adds
equivalent project-native hardware boundaries only.
