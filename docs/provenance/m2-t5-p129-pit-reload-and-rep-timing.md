# M2 T5 P129 Provenance: PIT Reload and REP Timing

After P128, the first difference was PIT1 mode-2 output at `F000:9BF5`.
Both machines had `reload=18` and `count=1`; PCjs had already lowered output.
PCjs lowers mode-2 output at count one, raises it on the following tick, and
rebases its timer cycle origin when it observes the reload.

The next bounded windows exposed two timing classes: `MOV Sreg,r/m16` at
`F000:9BFD` costs three PCjs cycles, and REP string execution at `F000:9C05`
costs seven cycles for the first iteration and three for continuing iterations.
The native implementation now models those generic device and CPU timing
semantics. No ROM-address, BIOS, or guest-service behavior was added.
