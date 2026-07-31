# M2 T5 P124 Verification: Control-Flow Timing

- Focused estimator tests cover short conditional taken/fall-through, loop
  taken/fall-through, and zero PCjs prefix charge.
- Cold browser timing windows no longer report the previously repeated `E2`
  loop or short-Jcc differences.
- The first remaining device difference is still PIT0 near `F000:BB27`; its
  completed `B0` instruction has matching cycle charges, leaving earlier MOV,
  CMP, TEST, CLI, and group timing classes as the next evidence-backed work.
- Full npm format, build, lint, test, and `git diff --check` are required.
