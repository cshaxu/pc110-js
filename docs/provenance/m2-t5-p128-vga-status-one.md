# M2 T5 P128 Provenance: VGA Input Status 1

The first post-P127 lockstep difference was `IN AL,DX` at `F000:BB3E` from
color Input Status 1 port `0x3DA`: native returned `0x00`; PCjs returned
`0x39`.

PCjs routes this port to the selected VGA/EGA color card. Its status model
starts in vertical retrace, derives timing from the selected 16 MHz VGA monitor
profile, returns retrace bits 0 and 3, toggles diagnostic bits 5 and 4 on each
read, and resets the attribute-controller address/data flip-flop. The
project-native device now models those generic register semantics from guest
cycles. It does not copy PCjs scheduling or add ROM-address-specific behavior.
