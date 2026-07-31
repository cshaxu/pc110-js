# M2 T5 P80 Verification

- Focused checkpoint tests must show that writes are retained independently of
  adjacent reads and are cleared by reset.
- A bounded Fast Execution browser run recorded the selected ROM at the earlier
  `F000:C662` boundary. The writes-only tail was `W0064:AA W0064:AD`; the mixed
  tail additionally showed the expected controller data reads without obscuring
  those writes. The run had not reached the later keyboard-buffer wait, so this
  is evidence of an earlier reproducible boundary rather than a resolution.
- The full gate must pass before commit.
