# M2 T5 P67 Provenance

- Trigger: P55 identified `F000:DCA7` as the next selected-ROM boundary after
  native keyboard BAT support; P66 supplied the required bounded replay path.
- Evidence: one governed Fast run reached `F000:DCA7` after 29,092,939
  instructions with the selected floppy, then two 5,000-instruction native
  Full Debug replays completed with identical final state.
- Classification: the pinned DeskPro source identifies `F000:DCA7` as the
  BIOS keyboard-read loop. It compares BDA queue head `0040:001A` with tail
  `0040:001C`; no headless external key event was supplied, so an empty queue
  is expected. This is not authority for synthetic scan codes, BDA writes, or
  guest-service behavior.
