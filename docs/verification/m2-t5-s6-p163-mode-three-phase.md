# M2 T5 S6 P163 Mode-Three Phase Verification

## Focused Checks

- PIT tests cover mode-3 visible counts, output transitions, latching,
  checkpoint restoration, and a fractional-cycle half-period boundary.
- Core and native-lockstep adapter regressions pass.
- A cold native-versus-PCjs search matches all 131,072 instruction boundaries
  in 128 batches with the selected local ROMs and floppy.

## Boundary

This crosses P162's former `F000:B5B7` PIT0 count difference. It does not
claim browser DOS boot or complete later whole-machine equivalence.
