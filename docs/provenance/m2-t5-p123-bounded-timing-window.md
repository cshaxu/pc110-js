# M2 T5 P123 Provenance: Bounded Timing Window

The first post-P122 device difference occurred after `F000:BB27`, where PIT0
counted one fewer native tick. The completed `B0` instruction had equal cycle
charges, so the observed PIT state is a consequence of earlier accumulated
timing differences rather than a PIT-specific defect.

The project-owned coordinator now runs a bounded 16-instruction window. It
retains every cycle-only difference and stops at the first CPU or device
difference. The development-only browser panel exposes this operation without
changing normal emulation or importing PCjs into the product path.

Browser evidence identified repeated `E2` loop timing differences and short
conditional-control differences before the first PIT divergence. The native
checkpoint replay identifies `F000:BB27` as `B0` followed by `E6` at
`F000:BB29`.
