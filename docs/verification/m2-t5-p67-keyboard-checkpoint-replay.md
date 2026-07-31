# M2 T5 P67 Verification

- `docs/evidence/m2-t5-p67-keyboard-checkpoint-replay.log` records the exact
  project and PCjs commits, system media hashes, 29,092,939-instruction Fast
  boundary, and deterministic 5,000-instruction Full Debug replay.
- The bounded trace repeats `DCA7 -> C242 -> C24B -> DCAA -> DCAC -> DCA6`,
  matching the source-level BDA-empty loop.
- Native browser keyboard delivery through 8042, PIC IRQ1, and the BIOS BDA
  handler remains the next acceptance check; no automatic input is claimed.
