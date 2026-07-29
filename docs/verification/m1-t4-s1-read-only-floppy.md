# M1 T4 S1 Verification: Read-Only DOS Floppy Attachment

## Result

Pass.

## Evidence

- The runner reads `../fdd.img` once after size and SHA-256 validation.
- Its generated machine XML replaces the two archive media mounts with a single
  drive A mount at `/_pc110js/media/fdd.img`.
- The endpoint serves the in-memory bytes and implements no write method.
- PCjs loads the response as a binary disk image through its FDC and Disk
  components; guest writes remain emulator-local deltas.
