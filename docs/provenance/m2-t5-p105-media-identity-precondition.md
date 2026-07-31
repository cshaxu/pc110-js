# M2 T5 P105 Provenance

- A first instruction comparison after a matched reset boundary diverged before
  it could serve as CPU evidence because the native browser had not loaded its
  selected ROM and floppy bytes.
- The development media endpoint exports the same pinned PCjs DeskPro BIOS and
  IBM VGA ROM hashes that the reference machine declares, and validates the
  same local floppy hash.
- Browser instruction comparison now refuses to run until the native side has
  loaded those verified assets. This is a diagnostic entry condition, not media
  synthesis or a guest workaround.
