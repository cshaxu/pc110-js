# M2 T5 P101 Verification

- Focused coordinator coverage proves that an accepted, paused PCjs reset is
  followed by the native normal reset and an immediate snapshot comparison.
- The reference-asset verifier requires the opt-in PCjs reset control on the
  sibling `pc110` branch.
- This part does not claim reset-state equivalence, a ROM checkpoint, or a
  successful whole-machine lockstep window.
