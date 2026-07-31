# M2 T5 P55 Provenance

- Authority: the owner-approved Fast/Selective/Full Debug diagnostic policy.
- Evidence: `docs/evidence/m2-t5-p54-keyboard-bat-fast.txt` records the one
  P54 Fast run, fixed project and PCjs identities, selected floppy hash, and
  final address `F000:DCA7`.
- Interpretation: BAT delivery is a valid controller/keyboard behavior but is
  not sufficient to advance the observed BDA keyboard-queue wait.
- Boundary: no second full Fast run, BIOS/BDA write, synthetic scan code, or
  speculative keyboard-protocol expansion follows from this mismatch.
