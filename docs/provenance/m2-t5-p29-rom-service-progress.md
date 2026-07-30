# M2 T5 P29 Provenance

- Behavioral source: selected DeskPro 386 ROM and IBM VGA ROM loaded through
  the existing local diagnostic contract.
- Comparison source: pinned read-only PCjs `tools/pc/pc.js` documents IBM VGA
  `INT 10h` initialization through `INT 6Dh`.
- Product change: the diagnostic runner now installs its trace hook only when
  a caller requests retained diagnostic data. The emulated CPU, memory,
  firmware bytes, and device behavior are unchanged.
