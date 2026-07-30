# M2 T3 S7 P5 PCjs Change Report: DeskPro Secondary PIT

PCjs maps a second 8253/8254 at `0x48`-`0x4B` only on the DeskPro 386. Original
TypeScript now composes that full port group through an explicit option and
reuses the project-native timer core. Generic PC/AT ports, PCjs runtime code,
FDC behavior, firmware changes, and synthetic interrupt/output wiring remain
unchanged.
