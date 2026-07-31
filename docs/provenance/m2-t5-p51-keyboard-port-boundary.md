# M2 T5 P51 Provenance

- Evidence: `m2-t5-p48-keyboard-port-diagnostic.txt` completed after the
  original terminal session ended. Its identity records project `f1dc36b`, the
  pinned PCjs source commit, selected floppy hash, and 160,000,000 instruction
  budget.
- Result: the project-native Fast machine completed at `F000:DCA7` and retained
  recent controller accesses at ports `0x64` and `0x60`.
- Limitation: the P47 runner tail records port identity but not data values.
  It cannot distinguish the controller commands or keyboard-directed bytes.
- Next evidence: P50's bounded browser tail includes direction, port, width,
  and value, so a short paused browser checkpoint can classify admission
  without another long diagnostic.
