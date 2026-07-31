# M2 T5 P86 Provenance

- `PcjsReferenceAssets` centralizes the existing reference-server ownership of
  pinned PCjs resource reads, temporary machine XML creation, and local floppy
  SHA-256 validation.
- Vite creates this surface only when `PC110JS_REFERENCE_PC110_PROBE=1`; the
  developer launcher supplies that setting only for `--pcjs-reference`.
- Diagnostic mode requires the local PCjs `pc110` branch and its already
  committed P82/P84 observation bundle. No PCjs source changed in this part.
