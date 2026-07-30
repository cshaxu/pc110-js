# M2 T5 P25 Verification: VGA Option ROM Entry

Focused tests cover little-endian 16-bit index/data transactions for sequencer,
graphics controller, CRTC, MDA, and CGA families, plus retained reserved
attribute index `0x1F` and masking of defined attributes. The bounded selected
ROM trace completes one million instructions at `C000:01FB` after entering the
native mapped VGA option ROM. The full quality gate remains required.
