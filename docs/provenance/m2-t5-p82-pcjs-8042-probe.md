# M2 T5 P82 Provenance

- Owner authorized a diagnostic-only PCjs change on its local `pc110` branch,
  never on PCjs `main`, after confirming that native devices are broadly
  implemented and the remaining issue is a cross-component ROM-flow boundary.
- PCjs exposes the 8042 port callback caller address and component registry,
  making a bounded controller event tail sufficient for transaction alignment.
- The native trace reached `F000:DCA7` after 50,000,000 Fast instructions but
  did not reach the requested `F000:CEDB` checkpoint. That invalidates the
  prior assumption that this checkpoint was on the observed flow.
- No PCjs implementation is copied into the project runtime. The probe remains
  a separate, opt-in diagnostic aid.
